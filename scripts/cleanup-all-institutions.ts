/**
 * Cleanup Script: Re-fetch and Reassign Employees for All Institutions
 *
 * For each of the 76 institutions (excluding 037 which is already cleaned):
 *   1. Fetch employees from HRIMS using vote code (RequestId 204) or TIN
 *      number (RequestId 205) — whichever is present.
 *   2. Filter the HRIMS response to only keep employees whose
 *      `currentWorkplace` matches the institution name (case-insensitive,
 *      whitespace-normalized).
 *   3. Upsert the filtered employees into the database under that
 *      institution.
 *   4. For existing employees currently assigned to that institution whose
 *      `currentWorkplace` does NOT match, reassign them to the institution
 *      whose name matches their workplace (among the 76 institutions).
 *   5. Delete employees whose `currentWorkplace` matches none of the 76
 *      institutions (including their related records).
 *
 * Usage:
 *   npx tsx scripts/cleanup-all-institutions.ts [--dry-run] [--institution-id <id>]
 *
 * Options:
 *   --dry-run               Report what would happen without making changes
 *   --institution-id <id>   Process only the specified institution
 *   --skip-fetch            Skip HRIMS fetch; only reassign/delete existing
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Prisma
// ---------------------------------------------------------------------------
const db = new PrismaClient();

// ---------------------------------------------------------------------------
// HRIMS config (read from DB settings — same source as the app)
// ---------------------------------------------------------------------------
async function getHrimsConfig() {
  const settings = await db.systemSettings.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const host = map['hrims_host'] || process.env.HRIMS_HOST || '10.0.217.11';
  const port = map['hrims_port'] || process.env.HRIMS_PORT || '8135';
  const apiKey = map['hrims_api_key'] || process.env.HRIMS_API_KEY || '';
  const token = map['hrims_token'] || process.env.HRIMS_TOKEN || '';

  return { baseUrl: `http://${host}:${port}/api`, apiKey, token };
}

// ---------------------------------------------------------------------------
// HRIMS fetch (paginated)
// ---------------------------------------------------------------------------
async function fetchFromHRIMS(
  requestId: string,
  requestPayloadData: Record<string, unknown>,
  config: { baseUrl: string; apiKey: string; token: string }
): Promise<any> {
  const response = await fetch(`${config.baseUrl}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: config.apiKey,
      Token: config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RequestId: requestId,
      RequestPayloadData: requestPayloadData,
    }),
  });
  if (!response.ok) {
    throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchAllEmployees(
  requestId: string,
  identifier: string,
  pageSize: number,
  config: { baseUrl: string; apiKey: string; token: string }
): Promise<any[]> {
  const all: any[] = [];
  let page = 0;
  let hasMore = true;
  const MAX_PAGES = 200;

  while (hasMore && page < MAX_PAGES) {
    const resp = await fetchFromHRIMS(
      requestId,
      { PageNumber: page, PageSize: pageSize, RequestBody: identifier },
      config
    );

    if (resp.code !== 200) {
      if (page === 0) {
        console.log(`    HRIMS returned code ${resp.code}: ${resp.message}`);
        return [];
      }
      break;
    }

    if (page === 0) {
      console.log(`    HRIMS overallDataSize: ${resp.overallDataSize}`);
    }

    if (resp.data && Array.isArray(resp.data)) {
      all.push(...resp.data);
    }

    const currentSize =
      resp.currentDataSize || resp.data?.length || 0;
    if (currentSize === 0 || currentSize < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return all;
}

// ---------------------------------------------------------------------------
// Institution matching
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  'ya', 'na', 'wa', 'la', 'za', 'cha', 'cho', 'vya', 'kwa',
  'serikali', 'zanzibar', 'serikalini', 'kuu', 'mkuu',
]);

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function keywords(s: string): string[] {
  return normalize(s)
    .replace(/[,.\(\)]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordScore(wp: string, inst: string): number {
  const wpKw = new Set(keywords(wp));
  const instKw = new Set(keywords(inst));
  if (wpKw.size === 0 || instKw.size === 0) return 0;
  let common = 0;
  for (const k of wpKw) if (instKw.has(k)) common++;
  return common / Math.min(wpKw.size, instKw.size);
}

/**
 * Match a workplace name to one of the 76 institutions.
 * Returns the institution ID or null if no match.
 */
function matchWorkplaceToInstitution(
  workplace: string,
  institutions: { id: string; name: string }[],
  excludeId?: string
): string | null {
  if (!workplace || workplace.trim() === '') return null;

  const wpNorm = normalize(workplace);

  // 1. Exact match
  for (const inst of institutions) {
    if (excludeId && inst.id === excludeId) continue;
    if (normalize(inst.name) === wpNorm) return inst.id;
  }

  // 2. Containment (one contains the other, ≥40% length ratio)
  for (const inst of institutions) {
    if (excludeId && inst.id === excludeId) continue;
    const instNorm = normalize(inst.name);
    if (wpNorm.length < 5 || instNorm.length < 5) continue;
    if (instNorm.includes(wpNorm) || wpNorm.includes(instNorm)) {
      const shorter = Math.min(wpNorm.length, instNorm.length);
      const longer = Math.max(wpNorm.length, instNorm.length);
      if (shorter / longer > 0.4) return inst.id;
    }
  }

  // 3. Keyword score (≥50%)
  let bestScore = 0;
  let bestId: string | null = null;
  for (const inst of institutions) {
    if (excludeId && inst.id === excludeId) continue;
    const s = keywordScore(workplace, inst.name);
    if (s > bestScore) {
      bestScore = s;
      bestId = inst.id;
    }
  }
  if (bestScore >= 0.5 && bestId) return bestId;

  return null;
}

// ---------------------------------------------------------------------------
// Employee save (mirrors hrims-sync-worker.ts mapping)
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

async function saveEmployee(
  hrimsData: any,
  institutionId: string
): Promise<string | null> {
  const personalInfo = hrimsData.personalInfo;
  if (!personalInfo?.zanIdNumber || personalInfo.zanIdNumber.trim() === '') {
    return null;
  }

  const currentEmployment =
    hrimsData.employmentHistories?.find((e: any) => e.isCurrent) ||
    hrimsData.employmentHistories?.[0];
  const currentSalary =
    hrimsData.salaryInformation?.find((s: any) => s.isCurrent) ||
    hrimsData.salaryInformation?.[0];
  const activeContract =
    hrimsData.contractDetails?.find((c: any) => c.isActive);

  const fullName = [
    personalInfo.firstName,
    personalInfo.middleName,
    personalInfo.lastName,
  ]
    .filter((n: string) => n && n.trim())
    .join(' ');

  let gender = 'Male';
  if (personalInfo.genderName) {
    if (personalInfo.genderName === 'Mwanamme') gender = 'Male';
    else if (personalInfo.genderName === 'Mwanamke') gender = 'Female';
    else if (['Male', 'Female'].includes(personalInfo.genderName)) {
      gender = personalInfo.genderName;
    }
  }

  const contactAddress =
    [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
      .filter((p: string) => p && p.trim())
      .join(', ') || null;

  const cadre = currentEmployment
    ? [
        currentEmployment.titlePrefixName,
        currentEmployment.titleName,
        currentEmployment.gradeName,
      ]
        .filter((p: string) => p && p.trim())
        .join(' ')
    : null;

  let status = 'On Probation';
  if (personalInfo.isEmployeeConfirmed) {
    status = 'Confirmed';
  } else if (currentEmployment) {
    const es = currentEmployment.employeeStatusName?.toLowerCase();
    if (es?.includes('staafu')) status = 'Retired';
    else if (es?.includes('hayupo')) status = 'Resigned';
    else if (es?.includes('aachishwa')) status = 'Terminated';
    else if (es?.includes('fukuzwa')) status = 'Dismissed';
    else if (currentEmployment.employmentStatusName?.toLowerCase().includes('hai'))
      status = 'Confirmed';
  }

  let retirementDate = null;
  if (
    activeContract?.toDate &&
    activeContract.toDate !== '1900-01-01T00:00:00'
  ) {
    retirementDate = new Date(activeContract.toDate);
  }

  const existing = await db.employee.findUnique({
    where: { zanId: personalInfo.zanIdNumber },
  });
  const employeeId = existing?.id || uuidv4();

  const dbEmployeeData = {
    id: employeeId,
    name: fullName,
    gender,
    dateOfBirth: personalInfo.birthDate
      ? new Date(personalInfo.birthDate)
      : null,
    placeOfBirth: personalInfo.placeOfBirth,
    region:
      personalInfo.districtName ||
      personalInfo.birthRegionName ||
      personalInfo.regionName,
    countryOfBirth: personalInfo.birthCountryName,
    zanId: personalInfo.zanIdNumber,
    phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone,
    contactAddress,
    zssfNumber: personalInfo.zssfNumber,
    payrollNumber: personalInfo.payrollNumber || '',
    cadre,
    salaryScale: currentSalary?.salaryScaleName,
    ministry:
      currentEmployment?.parentEntityName || currentEmployment?.entityName,
    department: currentEmployment?.subEntityName,
    appointmentType: currentEmployment?.appointmentTypeName,
    contractType: activeContract?.contractTypeName,
    recentTitleDate: currentEmployment?.fromDate
      ? new Date(currentEmployment.fromDate)
      : null,
    currentReportingOffice:
      currentEmployment?.divisionName || currentEmployment?.subEntityName,
    currentWorkplace: currentEmployment?.entityName,
    employmentDate: personalInfo.employmentDate
      ? new Date(personalInfo.employmentDate)
      : null,
    confirmationDate: personalInfo.employmentConfirmationDate
      ? new Date(personalInfo.employmentConfirmationDate)
      : null,
    retirementDate,
    status,
    employeeEntityId: personalInfo.zanIdNumber,
  };

  const { institutionId: _instId, ...dataWithoutInstId } = dbEmployeeData;

  await db.employee.upsert({
    where: { zanId: personalInfo.zanIdNumber },
    update: dataWithoutInstId,
    create: {
      ...dataWithoutInstId,
      Institution: { connect: { id: institutionId } },
    },
  });

  return employeeId;
}

// ---------------------------------------------------------------------------
// Delete employee with related records
// ---------------------------------------------------------------------------
async function deleteEmployeeCascade(employeeIds: string[]): Promise<number> {
  if (employeeIds.length === 0) return 0;

  const BATCH = 200;
  let deleted = 0;

  for (let i = 0; i < employeeIds.length; i += BATCH) {
    const batch = employeeIds.slice(i, i + BATCH);
    try {
      await db.cadreChangeRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.confirmationRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.lwopRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.promotionRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.resignationRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.retirementRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.separationRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.serviceExtensionRequest.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.employeeCertificate.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    try {
      await db.user.deleteMany({ where: { employeeId: { in: batch } } });
    } catch {}
    const result = await db.employee.deleteMany({ where: { id: { in: batch } } });
    deleted += result.count;
  }

  return deleted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipFetch = args.includes('--skip-fetch');
  const instIdIdx = args.indexOf('--institution-id');
  const instIdArg = instIdIdx >= 0 ? args[instIdIdx + 1] : undefined;

  console.log('='.repeat(80));
  console.log('Cleanup All Institutions — Fetch, Filter, Reassign, Delete');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Skip fetch: ${skipFetch}`);
  console.log('='.repeat(80));

  // Load all institutions
  const allInstitutions = await db.institution.findMany({
    select: { id: true, name: true, voteNumber: true, tinNumber: true },
    orderBy: { name: 'asc' },
  });
  console.log(`Total institutions: ${allInstitutions.length}`);

  // Skip 037 (already cleaned)
  const institutionsToProcess = instIdArg
    ? allInstitutions.filter((i) => i.id === instIdArg)
    : allInstitutions.filter((i) => i.voteNumber !== '037');

  console.log(`Institutions to process: ${institutionsToProcess.length}`);

  // HRIMS config
  const hrimsConfig = skipFetch ? null : await getHrimsConfig();
  if (hrimsConfig) {
    console.log(`HRIMS endpoint: ${hrimsConfig.baseUrl}`);
  }

  // Results summary
  const summary: {
    institutionId: string;
    institutionName: string;
    voteNumber: string | null;
    tinNumber: string | null;
    fetched: number;
    matched: number;
    saved: number;
    existingBefore: number;
    reassigned: number;
    deleted: number;
    finalCount: number;
  }[] = [];

  for (let idx = 0; idx < institutionsToProcess.length; idx++) {
    const inst = institutionsToProcess[idx];
    console.log(
      `\n${'─'.repeat(80)}\n` +
      `[${idx + 1}/${institutionsToProcess.length}] ${inst.name}` +
      ` (vote: ${inst.voteNumber || 'N/A'}, tin: ${inst.tinNumber || 'N/A'})\n` +
      `${'─'.repeat(80)}`
    );

    // --- Count existing employees ---
    const existingBefore = await db.employee.count({
      where: { institutionId: inst.id },
    });
    console.log(`  Existing employees: ${existingBefore}`);

    let fetched = 0;
    let matched = 0;
    let saved = 0;

    // --- Step 1: Fetch from HRIMS ---
    if (!skipFetch && hrimsConfig) {
      let requestId: string | null = null;
      let identifier: string | null = null;

      if (inst.voteNumber) {
        requestId = '204';
        identifier = inst.voteNumber;
      } else if (inst.tinNumber) {
        requestId = '205';
        identifier = inst.tinNumber;
      }

      if (requestId && identifier) {
        console.log(`  Fetching from HRIMS (RequestId ${requestId}, identifier: ${identifier})...`);
        try {
          const allHrimsEmployees = await fetchAllEmployees(
            requestId,
            identifier,
            100,
            hrimsConfig
          );
          fetched = allHrimsEmployees.length;
          console.log(`  Fetched: ${fetched} employees from HRIMS`);

          // --- Step 2: Filter by currentWorkplace matching institution name ---
          const instNameNorm = normalize(inst.name);
          const filtered = allHrimsEmployees.filter((emp: any) => {
            const currentEmployment =
              emp.employmentHistories?.find((e: any) => e.isCurrent) ||
              emp.employmentHistories?.[0];
            const wp = currentEmployment?.entityName ?? '';
            if (!wp || wp.trim() === '') return false;
            return normalize(wp) === instNameNorm;
          });
          matched = filtered.length;
          console.log(`  Matched (workplace = ${inst.name}): ${matched}`);

          // --- Step 3: Upsert filtered employees ---
          if (!dryRun && matched > 0) {
            for (const emp of filtered) {
              try {
                await saveEmployee(emp, inst.id);
                saved++;
              } catch (e) {
                // Log but continue
                console.log(`    Error saving: ${(e as Error).message}`);
              }
            }
            console.log(`  Saved: ${saved}`);
          }
        } catch (e) {
          console.log(`  HRIMS fetch failed: ${(e as Error).message}`);
        }
      } else {
        console.log(`  No vote number or TIN — skipping HRIMS fetch`);
      }
    }

    // --- Step 4: Reassign existing non-matching employees ---
    console.log(`  Reassigning non-matching employees...`);
    const existingEmps = await db.employee.findMany({
      where: { institutionId: inst.id },
      select: { id: true, currentWorkplace: true },
    });

    const toReassign: { id: string; targetId: string }[] = [];
    const toDelete: string[] = [];
    let stayCount = 0;

    for (const emp of existingEmps) {
      if (!emp.currentWorkplace || emp.currentWorkplace.trim() === '') {
        toDelete.push(emp.id);
        continue;
      }
      // Check if workplace matches current institution (fuzzy)
      const stayId = matchWorkplaceToInstitution(
        emp.currentWorkplace,
        [inst], // only check against current institution
      );
      if (stayId) {
        stayCount++;
        continue;
      }
      // Try to match to another institution
      const targetId = matchWorkplaceToInstitution(
        emp.currentWorkplace,
        allInstitutions,
        inst.id // exclude current institution
      );
      if (targetId) {
        toReassign.push({ id: emp.id, targetId });
      } else {
        toDelete.push(emp.id);
      }
    }

    console.log(`  Staying: ${stayCount}`);
    console.log(`  To reassign: ${toReassign.length}`);
    console.log(`  To delete: ${toDelete.length}`);

    let reassigned = 0;
    if (!dryRun && toReassign.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < toReassign.length; i += BATCH) {
        const batch = toReassign.slice(i, i + BATCH);
        const byInst: Record<string, string[]> = {};
        for (const r of batch) {
          if (!byInst[r.targetId]) byInst[r.targetId] = [];
          byInst[r.targetId].push(r.id);
        }
        for (const [targetId, ids] of Object.entries(byInst)) {
          const result = await db.employee.updateMany({
            where: { id: { in: ids }, institutionId: inst.id },
            data: { institutionId: targetId },
          });
          reassigned += result.count;
        }
      }
      console.log(`  Reassigned: ${reassigned}`);
    }

    // --- Step 5: Delete non-matching employees ---
    let deleted = 0;
    if (!dryRun && toDelete.length > 0) {
      deleted = await deleteEmployeeCascade(toDelete);
      console.log(`  Deleted: ${deleted}`);
    }

    // --- Final count ---
    const finalCount = dryRun
      ? stayCount
      : await db.employee.count({ where: { institutionId: inst.id } });
    console.log(`  Final count: ${finalCount}`);

    summary.push({
      institutionId: inst.id,
      institutionName: inst.name,
      voteNumber: inst.voteNumber,
      tinNumber: inst.tinNumber,
      fetched,
      matched,
      saved,
      existingBefore,
      reassigned,
      deleted,
      finalCount,
    });
  }

  // --- Summary table ---
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(
    'Institution | Vote | Existing | Fetched | Matched | Saved | Reassigned | Deleted | Final'
  );
  console.log('-'.repeat(100));
  for (const s of summary) {
    console.log(
      `${s.institutionName.substring(0, 30).padEnd(32)}| ` +
      `${(s.voteNumber || '').padEnd(5)}| ` +
      `${String(s.existingBefore).padEnd(9)}| ` +
      `${String(s.fetched).padEnd(8)}| ` +
      `${String(s.matched).padEnd(8)}| ` +
      `${String(s.saved).padEnd(6)}| ` +
      `${String(s.reassigned).padEnd(11)}| ` +
      `${String(s.deleted).padEnd(8)}| ` +
      `${s.finalCount}`
    );
  }

  // Totals
  const totals = summary.reduce(
    (acc, s) => ({
      fetched: acc.fetched + s.fetched,
      matched: acc.matched + s.matched,
      saved: acc.saved + s.saved,
      reassigned: acc.reassigned + s.reassigned,
      deleted: acc.deleted + s.deleted,
      finalCount: acc.finalCount + s.finalCount,
    }),
    { fetched: 0, matched: 0, saved: 0, reassigned: 0, deleted: 0, finalCount: 0 }
  );
  console.log('-'.repeat(100));
  console.log(
    `${'TOTAL'.padEnd(32)}|      | ` +
    `${''.padEnd(9)}| ` +
    `${String(totals.fetched).padEnd(8)}| ` +
    `${String(totals.matched).padEnd(8)}| ` +
    `${String(totals.saved).padEnd(6)}| ` +
    `${String(totals.reassigned).padEnd(11)}| ` +
    `${String(totals.deleted).padEnd(8)}| ` +
    `${totals.finalCount}`
  );

  // Save summary to file
  const reportPath = 'docs/HRIMS_CLEANUP_ALL_INSTITUTIONS_RESULTS.md';
  if (!dryRun) {
    let md = '# HRIMS Cleanup — All Institutions Results\n\n';
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Institutions processed:** ${summary.length}\n\n`;
    md += '| Institution | Vote | Existing Before | Fetched | Matched | Saved | Reassigned | Deleted | Final |\n';
    md += '|---|---|---|---|---|---|---|---|---|\n';
    for (const s of summary) {
      md += `| ${s.institutionName} | ${s.voteNumber || ''} | ${s.existingBefore} | ${s.fetched} | ${s.matched} | ${s.saved} | ${s.reassigned} | ${s.deleted} | ${s.finalCount} |\n`;
    }
    md += `\n**Totals:** Fetched ${totals.fetched}, Matched ${totals.matched}, Saved ${totals.saved}, Reassigned ${totals.reassigned}, Deleted ${totals.deleted}\n`;
    fs.writeFileSync(reportPath, md);
    console.log(`\nReport saved to ${reportPath}`);
  }

  await db.$disconnect();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});