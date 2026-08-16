/**
 * Step 2: Re-fetch employees with NULL currentWorkplace from HRIMS.
 *
 * 28,761 employees in TUME YA UTUMISHI SERIKALINI were synced from an early
 * bulk fetch (RequestId 204) that only stored basic identity fields (name,
 * zanId, payrollNumber, status) — all employment-detail fields are NULL.
 * This script re-fetches each one individually from HRIMS (RequestId 202,
 * by payrollNumber) to populate department, ministry, currentWorkplace,
 * currentReportingOffice, cadre, etc.
 *
 * The HRIMS upsert does NOT overwrite institutionId on update (by design),
 * so after re-fetching, a separate reassignment pass matches currentWorkplace
 * to the correct institution and updates institutionId directly.
 *
 * Features:
 *   - Resumable: tracks progress in a local state file; skip already-processed
 *     payroll numbers on re-run.
 *   - Rate-limited: configurable delay between API calls.
 *   - Batched DB updates: updates employees in batches of 50.
 *   - Progress logging every 100 employees.
 *   - Reassignment pass at the end.
 *
 * Usage:
 *   npx tsx scripts/refetch-null-workplace-employees.ts [--dry-run] [--delay=100]
 */

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { getHrimsApiConfig } from '../src/lib/hrims-config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const db = new PrismaClient();

// --- Config ---------------------------------------------------------------

const TUME_ID = 'cmd059ion0000e6d85kexfukl';
const STATE_FILE = 'scripts/state/refetch-progress.json';
const BATCH_SIZE = 50;
const LOG_EVERY = 100;
const HRIMS_REQUEST_ID = '202';
const DEFAULT_DELAY_MS = 100;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const delayArg = args.find((a) => a.startsWith('--delay='));
const DELAY_MS = delayArg ? parseInt(delayArg.split('=')[1]) : DEFAULT_DELAY_MS;

// --- Types ----------------------------------------------------------------

interface HrimsEmployment {
  isCurrent?: boolean;
  entityName?: string;
  parentEntityName?: string;
  subEntityName?: string;
  divisionName?: string;
  appointmentTypeName?: string;
  employeeStatusName?: string;
  employmentStatusName?: string;
  titlePrefixName?: string;
  titleName?: string;
  gradeName?: string;
  fromDate?: string;
}

interface HrimsSalary {
  isCurrent?: boolean;
  salaryScaleName?: string;
}

interface HrimsContract {
  isActive?: boolean;
  toDate?: string;
  contractTypeName?: string;
}

interface HrimsPersonalInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'N/A';
  birthDate?: string;
  placeOfBirth?: string;
  districtName?: string;
  birthRegionName?: string;
  regionName?: string;
  birthCountryName?: string;
  zanIdNumber?: string;
  primaryPhone?: string;
  workPhone?: string;
  physicalAddress?: string;
  postalAddress?: string;
  zssfNumber?: string;
  payrollNumber?: string;
  employmentDate?: string;
  employmentConfirmationDate?: string;
  isEmployeeConfirmed?: boolean;
}

interface HrimsEmployeeData {
  personalInfo?: HrimsPersonalInfo;
  employmentHistories?: HrimsEmployment[];
  salaryInformation?: HrimsSalary[];
  contractDetails?: HrimsContract[];
}

interface HrimsResponse {
  success?: boolean;
  data?: HrimsEmployeeData;
}

interface EmployeeUpdate {
  zanId: string;
  data: Prisma.EmployeeUpdateInput;
}

interface State {
  processed: string[];
  succeeded: number;
  failed: number;
  notFound: number;
  reassigned: number;
}

interface EmployeeRecord {
  id: string;
  name: string;
  zanId: string;
  payrollNumber: string;
}

interface InstitutionRecord {
  id: string;
  name: string;
}

// --- State persistence -----------------------------------------------------

function loadState(): State {
  try {
    return JSON.parse(
      readFileSync(STATE_FILE, 'utf-8')
    ) as State;
  } catch {
    return { processed: [], succeeded: 0, failed: 0, notFound: 0, reassigned: 0 };
  }
}

function saveState(state: State): void {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// --- HRIMS fetch -----------------------------------------------------------

async function fetchEmployeeFromHRIMS(
  payrollNumber: string,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
): Promise<HrimsEmployeeData | null> {
  const response = await fetch(`${hrimsConfig.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: hrimsConfig.API_KEY,
      Token: hrimsConfig.TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RequestId: HRIMS_REQUEST_ID,
      RequestPayloadData: { RequestBody: payrollNumber },
    }),
  });

  if (!response.ok) {
    throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as HrimsResponse;

  if (!data || data.success === false || !data.data) {
    return null;
  }

  return data.data;
}

// --- Data mapping ----------------------------------------------------------

function mapHrimsToEmployeeData(hrimsData: HrimsEmployeeData): Prisma.EmployeeUpdateInput {
  const personalInfo = hrimsData.personalInfo;
  const currentEmployment =
    hrimsData.employmentHistories?.find((emp) => emp.isCurrent) ||
    hrimsData.employmentHistories?.[0];
  const currentSalary =
    hrimsData.salaryInformation?.find((sal) => sal.isCurrent) ||
    hrimsData.salaryInformation?.[0];

  const firstName = [personalInfo?.firstName, personalInfo?.middleName]
    .filter(Boolean)
    .join(' ');
  const fullName = [firstName, personalInfo?.lastName].filter(Boolean).join(' ');

  let status = 'On Probation';
  if (personalInfo?.isEmployeeConfirmed) {
    status = 'Confirmed';
  } else if (currentEmployment) {
    const empStatus = currentEmployment.employeeStatusName?.toLowerCase();
    if (empStatus?.includes('staafu')) status = 'Retired';
    else if (empStatus?.includes('hayupo')) status = 'Resigned';
    else if (empStatus?.includes('aachishwa')) status = 'Terminated';
    else if (empStatus?.includes('fukuzwa')) status = 'Dismissed';
    else if (currentEmployment.employmentStatusName?.toLowerCase().includes('hai'))
      status = 'Confirmed';
  }

  const cadre = currentEmployment
    ? [
        currentEmployment.titlePrefixName,
        currentEmployment.titleName,
        currentEmployment.gradeName,
      ]
        .filter((part): part is string => !!part?.trim())
        .join(' ')
    : null;

  let retirementDate: Date | null = null;
  const activeContract = hrimsData.contractDetails?.find((c) => c.isActive);
  if (activeContract?.toDate && activeContract.toDate !== '1900-01-01T00:00:00') {
    retirementDate = new Date(activeContract.toDate);
  }

  const contactAddress =
    [personalInfo?.physicalAddress, personalInfo?.postalAddress]
      .filter(Boolean)
      .join(', ') || null;

  return {
    name: fullName || undefined,
    gender: personalInfo?.gender || undefined,
    dateOfBirth: personalInfo?.birthDate ? new Date(personalInfo.birthDate) : undefined,
    placeOfBirth: personalInfo?.placeOfBirth || undefined,
    region:
      personalInfo?.districtName ||
      personalInfo?.birthRegionName ||
      personalInfo?.regionName ||
      undefined,
    countryOfBirth: personalInfo?.birthCountryName || undefined,
    phoneNumber: personalInfo?.primaryPhone || personalInfo?.workPhone || undefined,
    contactAddress: contactAddress || undefined,
    zssfNumber: personalInfo?.zssfNumber || undefined,
    payrollNumber: personalInfo?.payrollNumber || '',
    cadre: cadre || undefined,
    salaryScale: currentSalary?.salaryScaleName || undefined,
    ministry:
      currentEmployment?.parentEntityName || currentEmployment?.entityName || undefined,
    department: currentEmployment?.subEntityName || undefined,
    appointmentType: currentEmployment?.appointmentTypeName || undefined,
    contractType: activeContract?.contractTypeName || undefined,
    recentTitleDate: currentEmployment?.fromDate
      ? new Date(currentEmployment.fromDate)
      : undefined,
    currentReportingOffice:
      currentEmployment?.divisionName || currentEmployment?.subEntityName || undefined,
    currentWorkplace: currentEmployment?.entityName || undefined,
    employmentDate: personalInfo?.employmentDate
      ? new Date(personalInfo.employmentDate)
      : undefined,
    confirmationDate: personalInfo?.employmentConfirmationDate
      ? new Date(personalInfo.employmentConfirmationDate)
      : undefined,
    retirementDate: retirementDate || undefined,
    status: status,
  };
}

// --- Reassignment ----------------------------------------------------------

function normalize(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function reassignByWorkplace(): Promise<number> {
  const allInstitutions = await db.institution.findMany({
    select: { id: true, name: true },
  });
  const instMap = new Map<string, InstitutionRecord>();
  for (const inst of allInstitutions) {
    instMap.set(normalize(inst.name), inst);
  }

  const workplaces = await db.employee.groupBy({
    by: ['currentWorkplace'],
    where: {
      institutionId: TUME_ID,
      NOT: { currentWorkplace: null },
    },
    _count: { _all: true },
    orderBy: { _count: { currentWorkplace: 'desc' } },
  });

  let totalReassigned = 0;

  for (const g of workplaces) {
    if (!g.currentWorkplace) continue;
    const inst = instMap.get(normalize(g.currentWorkplace));

    if (inst && inst.id !== TUME_ID) {
      const result = await db.employee.updateMany({
        where: { institutionId: TUME_ID, currentWorkplace: g.currentWorkplace },
        data: { institutionId: inst.id },
      });
      totalReassigned += result.count;
      console.log(`  REASSIGN: ${result.count} "${g.currentWorkplace}" -> ${inst.name}`);
    }
  }

  return totalReassigned;
}

// --- Main ------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Step 2: Re-fetch NULL-workplace employees from HRIMS ===');
  console.log(`Delay between calls: ${DELAY_MS}ms`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log();

  const hrimsConfig = await getHrimsApiConfig();
  console.log(`HRIMS endpoint: ${hrimsConfig.BASE_URL}`);

  const state = loadState();
  console.log(
    `Resuming: ${state.processed.length} already processed, ` +
      `${state.succeeded} succeeded, ${state.failed} failed, ${state.notFound} not found`
  );

  const employees = await db.employee.findMany({
    where: {
      institutionId: TUME_ID,
      OR: [{ currentWorkplace: null }, { currentWorkplace: '' }],
    },
    select: { id: true, name: true, zanId: true, payrollNumber: true },
    orderBy: { payrollNumber: 'asc' },
  });

  console.log(`Total NULL-workplace employees to process: ${employees.length}`);

  const processedSet = new Set(state.processed);
  const toProcess = employees.filter(
    (e: EmployeeRecord) => e.payrollNumber && !processedSet.has(e.payrollNumber)
  );
  console.log(`Remaining to process: ${toProcess.length}`);
  console.log();

  if (toProcess.length === 0) {
    console.log('All employees already processed. Running reassignment...');
    const reassigned = await reassignByWorkplace();
    console.log(`Reassigned: ${reassigned}`);
    await db.$disconnect();
    return;
  }

  const startTime = Date.now();
  let batchUpdates: EmployeeUpdate[] = [];
  let processedCount = 0;

  async function flushBatch(): Promise<void> {
    if (batchUpdates.length === 0) return;
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update ${batchUpdates.length} employees`);
      batchUpdates = [];
      return;
    }

    // Update individually so a unique-constraint violation on one employee
    // (e.g. duplicate zssfNumber from HRIMS data) doesn't fail the batch.
    for (const u of batchUpdates) {
      try {
        await db.employee.update({ where: { zanId: u.zanId }, data: u.data });
        state.succeeded++;
      } catch (e: unknown) {
        state.failed++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  DB UPDATE FAILED: zanId=${u.zanId}: ${msg}`);
      }
    }
    batchUpdates = [];
  }

  let lastWorkplace: string | undefined;
  let lastDept: string | undefined;

  for (const emp of toProcess) {
    processedCount++;
    lastWorkplace = undefined;
    lastDept = undefined;

    try {
      const hrimsData = await fetchEmployeeFromHRIMS(emp.payrollNumber, hrimsConfig);

      if (!hrimsData) {
        state.notFound++;
      } else {
        const mapped = mapHrimsToEmployeeData(hrimsData);
        lastWorkplace = mapped.currentWorkplace as string | undefined;
        lastDept = mapped.department as string | undefined;

        if (mapped.currentWorkplace || mapped.department || mapped.ministry) {
          batchUpdates.push({ zanId: emp.zanId, data: mapped });
        } else {
          state.notFound++;
        }
      }

      if (processedCount % LOG_EVERY === 0) {
        const elapsed = Date.now() - startTime;
        const rate = (processedCount / (elapsed / 1000)).toFixed(1);
        const remaining = toProcess.length - processedCount;
        const eta = ((remaining / parseFloat(rate)) / 60).toFixed(0);
        console.log(
          `  [${processedCount}/${toProcess.length}] ` +
            `${emp.name} -> workplace=${lastWorkplace ?? 'NULL'}, ` +
            `dept=${lastDept ?? 'NULL'} | ` +
            `rate=${rate}/s, ETA=${eta}min`
        );
      }
    } catch (error: unknown) {
      state.failed++;
      const msg = error instanceof Error ? error.message : String(error);
      if (processedCount % LOG_EVERY === 0 || state.failed <= 5) {
        console.error(`  [${processedCount}/${toProcess.length}] FAILED: ${emp.name} (payroll=${emp.payrollNumber}): ${msg}`);
      }
    }

    state.processed.push(emp.payrollNumber);

    if (batchUpdates.length >= BATCH_SIZE) {
      await flushBatch();
    }

    if (processedCount % LOG_EVERY === 0) {
      saveState(state);
    }

    if (!DRY_RUN) {
      await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  await flushBatch();
  saveState(state);

  const elapsed = Date.now() - startTime;
  console.log();
  console.log('=== Fetch Phase Complete ===');
  console.log(`Processed: ${processedCount}`);
  console.log(`Succeeded: ${state.succeeded}`);
  console.log(`Not found: ${state.notFound}`);
  console.log(`Failed: ${state.failed}`);
  console.log(`Elapsed: ${(elapsed / 1000 / 60).toFixed(1)} min`);
  console.log();

  console.log('=== Reassignment Phase ===');
  if (DRY_RUN) {
    console.log('[DRY RUN] Skipping reassignment');
  } else {
    const reassigned = await reassignByWorkplace();
    state.reassigned += reassigned;
    console.log(`Total reassigned: ${reassigned}`);
    saveState(state);
  }

  const tumeCount = await db.employee.count({ where: { institutionId: TUME_ID } });
  const nullWp = await db.employee.count({
    where: {
      institutionId: TUME_ID,
      OR: [{ currentWorkplace: null }, { currentWorkplace: '' }],
    },
  });
  console.log();
  console.log('=== Final State ===');
  console.log(`Tume employee count: ${tumeCount}`);
  console.log(`Still NULL workplace: ${nullWp}`);
  console.log(`Real Tume staff (with workplace): ${tumeCount - nullWp}`);

  await db.$disconnect();
}

main().catch((e: unknown) => {
  console.error('Fatal error:', e);
  process.exit(1);
});