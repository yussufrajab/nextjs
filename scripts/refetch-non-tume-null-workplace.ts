/**
 * Step 2b: Re-fetch non-TUME employees with NULL currentWorkplace from HRIMS.
 *
 * The main refetch script (refetch-null-workplace-employees.ts) only targeted
 * institutionId = TUME_ID. This script picks up the remaining employees at
 * other institutions who were never sent to HRIMS for workplace population.
 *
 * Reuses the same HRIMS fetch + mapping logic but targets:
 *   institutionId != TUME_ID AND currentWorkplace IS NULL
 */

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { getHrimsApiConfig } from '../src/lib/hrims-config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const db = new PrismaClient();

// --- Config ---------------------------------------------------------------

const TUME_ID = 'cmd059ion0000e6d85kexfukl';
const STATE_FILE = 'scripts/state/refetch-non-tume-progress.json';
const LOG_EVERY = 10;
const HRIMS_REQUEST_ID = '202';
const DEFAULT_DELAY_MS = 100;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const delayArg = args.find((a) => a.startsWith('--delay='));
const DELAY_MS = delayArg ? parseInt(delayArg.split('=')[1]) : DEFAULT_DELAY_MS;

// --- Types ----------------------------------------------------------------

interface HrimsEmployment {
  entityName?: string;
  parentEntityName?: string;
  subEntityName?: string;
  divisionName?: string;
  titlePrefixName?: string;
  titleName?: string;
  gradeName?: string;
  appointmentTypeName?: string;
  employeeStatusName?: string;
  employmentStatusName?: string;
  fromDate?: string;
  isCurrent?: boolean;
}

interface HrimsSalary {
  salaryScaleName?: string;
  isCurrent?: boolean;
}

interface HrimsContract {
  contractTypeName?: string;
  fromDate?: string;
  toDate?: string;
  isActive?: boolean;
}

interface HrimsPersonalInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: string;
  placeOfBirth?: string;
  birthRegionName?: string;
  birthCountryName?: string;
  regionName?: string;
  districtName?: string;
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
  success: boolean;
  data: HrimsEmployeeData | null;
}

interface EmployeeUpdate {
  zanId: string;
  data: Prisma.EmployeeUpdateInput;
}

interface EmployeeRecord {
  id: string;
  name: string;
  zanId: string;
  payrollNumber: string;
  Institution: { name: string };
}

interface State {
  processed: string[];
  succeeded: number;
  failed: number;
  notFound: number;
  results: Array<{ payrollNumber: string; name: string; institution: string; workplace: string | null; status: string }>;
}

// --- State persistence -----------------------------------------------------

function loadState(): State {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    const raw = readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { processed: [], succeeded: 0, failed: 0, notFound: 0, results: [] };
  }
}

function saveState(state: State): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
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

// --- Main ------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Step 2b: Re-fetch non-TUME NULL-workplace employees from HRIMS ===');
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
      institutionId: { not: TUME_ID },
      OR: [{ currentWorkplace: null }, { currentWorkplace: '' }],
      payrollNumber: { not: null },
    },
    select: {
      id: true,
      name: true,
      zanId: true,
      payrollNumber: true,
      Institution: { select: { name: true } },
    },
    orderBy: { payrollNumber: 'asc' },
  });

  console.log(`Total non-TUME NULL-workplace employees: ${employees.length}`);

  const processedSet = new Set(state.processed);
  const toProcess = employees.filter(
    (e: EmployeeRecord) => e.payrollNumber && !processedSet.has(e.payrollNumber)
  );
  console.log(`Remaining to process: ${toProcess.length}`);
  console.log();

  if (toProcess.length === 0) {
    console.log('All already processed. Exiting.');
    await db.$disconnect();
    return;
  }

  const startTime = Date.now();
  let processedCount = 0;

  for (const emp of toProcess) {
    processedCount++;
    const institutionName = emp.Institution.name;

    try {
      const hrimsData = await fetchEmployeeFromHRIMS(emp.payrollNumber, hrimsConfig);

      if (!hrimsData) {
        state.notFound++;
        state.results.push({
          payrollNumber: emp.payrollNumber,
          name: emp.name,
          institution: institutionName,
          workplace: null,
          status: 'NOT_FOUND',
        });
        if (processedCount % LOG_EVERY === 0 || true) {
          console.log(
            `  [${processedCount}/${toProcess.length}] NOT FOUND: ${emp.name} (payroll=${emp.payrollNumber}, inst=${institutionName})`
          );
        }
      } else {
        const mapped = mapHrimsToEmployeeData(hrimsData);
        const workplace = mapped.currentWorkplace as string | undefined;

        if (mapped.currentWorkplace || mapped.department || mapped.ministry) {
          if (DRY_RUN) {
            console.log(
              `  [DRY RUN] Would update: ${emp.name} -> workplace=${workplace ?? 'NULL'} (inst=${institutionName})`
            );
          } else {
            try {
              await db.employee.update({ where: { zanId: emp.zanId }, data: mapped });
              state.succeeded++;
            } catch (e: unknown) {
              state.failed++;
              const msg = e instanceof Error ? e.message : String(e);
              console.error(
                `  DB UPDATE FAILED: zanId=${emp.zanId} (${emp.name}): ${msg}`
              );
            }
          }
          state.results.push({
            payrollNumber: emp.payrollNumber,
            name: emp.name,
            institution: institutionName,
            workplace: workplace ?? null,
            status: 'UPDATED',
          });
          console.log(
            `  [${processedCount}/${toProcess.length}] UPDATED: ${emp.name} -> workplace=${workplace ?? 'NULL'} (inst=${institutionName})`
          );
        } else {
          state.notFound++;
          state.results.push({
            payrollNumber: emp.payrollNumber,
            name: emp.name,
            institution: institutionName,
            workplace: null,
            status: 'NO_WORKPLACE',
          });
          console.log(
            `  [${processedCount}/${toProcess.length}] NO WORKPLACE: ${emp.name} (inst=${institutionName})`
          );
        }
      }
    } catch (error: unknown) {
      state.failed++;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `  [${processedCount}/${toProcess.length}] FAILED: ${emp.name} (payroll=${emp.payrollNumber}): ${msg}`
      );
      state.results.push({
        payrollNumber: emp.payrollNumber,
        name: emp.name,
        institution: institutionName,
        workplace: null,
        status: `ERROR: ${msg}`,
      });
    }

    state.processed.push(emp.payrollNumber);

    if (!DRY_RUN) {
      await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  saveState(state);

  const elapsed = Date.now() - startTime;
  console.log();
  console.log('=== Complete ===');
  console.log(`Processed: ${processedCount}`);
  console.log(`Succeeded: ${state.succeeded}`);
  console.log(`Not found: ${state.notFound}`);
  console.log(`Failed: ${state.failed}`);
  console.log(`Elapsed: ${(elapsed / 1000).toFixed(1)}s`);
  console.log();

  console.log('=== Results ===');
  for (const r of state.results) {
    console.log(
      `  ${r.status.padEnd(12)} ${r.payrollNumber}  ${r.name}  [${r.institution}]  -> ${r.workplace ?? 'NULL'}`
    );
  }

  await db.$disconnect();
}

main().catch((e: unknown) => {
  console.error('Fatal error:', e);
  process.exit(1);
});