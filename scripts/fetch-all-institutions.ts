import { PrismaClient } from '@prisma/client';

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
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchInstitutionData(
  institution: { id: string; name: string; voteNumber: string | null; tinNumber: string | null },
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
      error: 'No vote number or TIN number available'
    };
  }

  try {
    console.log(`\nFetching ${institution.name}...${retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : ''}`);
    console.log(`Using ${identifierType}: ${identifier}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 minutes

    const response = await fetch('http://localhost:9002/api/hrims/fetch-by-institution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifierType,
        voteNumber: institution.voteNumber,
        tinNumber: institution.tinNumber,
        institutionId: institution.id,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error: ${errorMessage}`);

    // Retry on fetch failures (timeouts, network errors)
    if (retryCount < maxRetries && (errorMessage.includes('fetch failed') || errorMessage.includes('timeout'))) {
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
  console.log('🚀 Starting to fetch data for all institutions...\n');
  console.log('='.repeat(80));

  // Fetch all institutions
  const institutions = await prisma.institution.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`\nFound ${institutions.length} institutions in the database\n`);

  const results: FetchResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    console.log(`\n[${i + 1}/${institutions.length}] Processing: ${institution.name}`);

    // Check if institution has any identifier
    if (!institution.voteNumber && !institution.tinNumber) {
      console.log(`⏭️  Skipping: No vote number or TIN number available`);
      skippedCount++;
      results.push({
        institutionId: institution.id,
        institutionName: institution.name,
        identifier: 'N/A',
        identifierType: 'votecode',
        success: false,
        error: 'No identifier available'
      });
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

    // Pause between requests (10 seconds for overnight run to avoid overwhelming API)
    if (i < institutions.length - 1) {
      console.log(`\n⏳ Pausing for 10 seconds before next fetch...`);
      await sleep(10000);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 FETCH SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total institutions: ${institutions.length}`);
  console.log(`✅ Successfully fetched: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`⏭️  Skipped (no identifier): ${skippedCount}`);

  // Print detailed results
  console.log('\n📋 DETAILED RESULTS');
  console.log('='.repeat(80));

  console.log('\n✅ Successful fetches:');
  results.filter(r => r.success).forEach((r, i) => {
    console.log(`${i + 1}. ${r.institutionName} (${r.identifierType}: ${r.identifier}) - ${r.employeeCount} employees`);
  });

  console.log('\n❌ Failed fetches:');
  results.filter(r => !r.success).forEach((r, i) => {
    console.log(`${i + 1}. ${r.institutionName} - ${r.error}`);
  });

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
