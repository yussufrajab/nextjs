import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface FetchResult {
  institutionId: string;
  institutionName: string;
  identifier: string;
  identifierType: 'votecode' | 'tin';
  success: boolean;
  employeeCount?: number;
  error?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchInstitutionData(
  institution: {
    id: string;
    name: string;
    voteNumber: string | null;
    tinNumber: string | null;
  },
  retryCount = 0,
  maxRetries = 2
): Promise<FetchResult> {
  // Determine which identifier to use
  let identifierType: 'votecode' | 'tin';
  let identifier: string;

  if (institution.voteNumber) {
    identifierType = 'votecode';
    identifier = institution.voteNumber;
  } else if (institution.tinNumber) {
    identifierType = 'tin';
    identifier = institution.tinNumber;
  } else {
    return {
      institutionId: institution.id,
      institutionName: institution.name,
      identifier: 'N/A',
      identifierType: 'votecode',
      success: false,
      error: 'No vote number or TIN number available',
    };
  }

  try {
    console.log(
      `\nFetching ${institution.name}...${retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : ''}`
    );
    console.log(`Using ${identifierType}: ${identifier}`);

    const response = await axios.post(
      'http://localhost:9002/api/hrims/fetch-by-institution',
      {
        identifierType,
        voteNumber: institution.voteNumber,
        tinNumber: institution.tinNumber,
        institutionId: institution.id,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 1800000, // 30 minutes
      }
    );

    const result = response.data;

    if (result.success) {
      console.log(`✅ Success: Fetched ${result.data.employeeCount} employees`);
      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: true,
        employeeCount: result.data.employeeCount,
      };
    } else {
      console.log(`❌ Failed: ${result.message}`);
      return {
        institutionId: institution.id,
        institutionName: institution.name,
        identifier,
        identifierType,
        success: false,
        error: result.message,
      };
    }
  } catch (error) {
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout';
      } else if (error.response) {
        errorMessage = error.response.data?.message || error.message;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.log(`❌ Error: ${errorMessage}`);

    // Retry on fetch failures (timeouts, network errors)
    if (
      retryCount < maxRetries &&
      (errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNABORTED') ||
        errorMessage.includes('network'))
    ) {
      console.log(`⏳ Waiting 10 seconds before retry...`);
      await sleep(10000); // 10 second wait before retry
      return fetchInstitutionData(institution, retryCount + 1, maxRetries);
    }

    return {
      institutionId: institution.id,
      institutionName: institution.name,
      identifier,
      identifierType,
      success: false,
      error: errorMessage,
    };
  }
}

async function main() {
  console.log('🚀 Re-fetching data for failed institutions...\n');
  console.log('='.repeat(80));

  // List of institutions that timed out or failed
  const failedInstitutionNames = [
    'Hospitali ya Mnazi Mmoja',
    'OFISI YA RAIS, FEDHA NA MIPANGO',
    'OFISI YA RAIS - IKULU',
    'Taasisi ya Utafiti wa Uvuvi (ZAFIRI)',
    'Wakala wa Barabara',
    'WIZARA YA AFYA',
    'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
    'WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO',
    'WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO',
  ];

  // Fetch these institutions from database
  const institutions = await prisma.institution.findMany({
    where: {
      name: {
        in: failedInstitutionNames,
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\nFound ${institutions.length} failed institutions to retry\n`);

  const results: FetchResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    console.log(
      `\n[${i + 1}/${institutions.length}] Processing: ${institution.name}`
    );

    // Check if institution has any identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      console.log(`⏭️  Skipping: No vote number or TIN number available`);
      results.push({
        institutionId: institution.id,
        institutionName: institution.name,
        identifier: 'N/A',
        identifierType: 'votecode',
        success: false,
        error: 'No identifier available',
      });
      failureCount++;
      continue;
    }

    // Fetch data for this institution
    const result = await fetchInstitutionData(institution);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Pause between requests (15 seconds for large institutions)
    if (i < institutions.length - 1) {
      console.log(`\n⏳ Pausing for 15 seconds before next fetch...`);
      await sleep(15000);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RETRY SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total institutions retried: ${institutions.length}`);
  console.log(`✅ Successfully fetched: ${successCount}`);
  console.log(`❌ Still failed: ${failureCount}`);

  // Print detailed results
  console.log('\n📋 DETAILED RESULTS');
  console.log('='.repeat(80));

  console.log('\n✅ Successful fetches:');
  results
    .filter((r) => r.success)
    .forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.institutionName} (${r.identifierType}: ${r.identifier}) - ${r.employeeCount} employees`
      );
    });

  console.log('\n❌ Failed fetches:');
  results
    .filter((r) => !r.success)
    .forEach((r, i) => {
      console.log(`${i + 1}. ${r.institutionName} - ${r.error}`);
    });

  // Final employee count
  const totalEmployees = await prisma.employee.count();
  console.log('\n' + '='.repeat(80));
  console.log(
    `\n📊 TOTAL EMPLOYEES IN DATABASE: ${totalEmployees.toLocaleString()}`
  );
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
