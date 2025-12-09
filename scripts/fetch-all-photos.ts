#!/usr/bin/env npx tsx

/**
 * Automated Employee Photo Fetching Script
 *
 * This script automatically fetches employee photos from HRIMS for all institutions
 * and stores them in the database.
 *
 * Usage:
 *   npx tsx scripts/fetch-all-photos.ts [options]
 *
 * Options:
 *   --institution-id <id>    Fetch photos for a specific institution only
 *   --skip-existing          Skip employees who already have photos
 *   --delay <ms>             Delay between requests in milliseconds (default: 100)
 *   --batch-size <n>         Number of employees to process (default: all)
 *   --dry-run                Show what would be done without making changes
 */

import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../src/lib/minio';

const prisma = new PrismaClient();

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

interface PhotoFetchResult {
  employeeName: string;
  payrollNumber: string;
  institutionName: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

interface ScriptOptions {
  institutionId?: string;
  skipExisting: boolean;
  delay: number;
  batchSize?: number;
  dryRun: boolean;
}

// Parse command line arguments
function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    skipExisting: false,
    delay: 100,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--institution-id':
        options.institutionId = args[++i];
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '--delay':
        options.delay = parseInt(args[++i]) || 100;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Automated Employee Photo Fetching Script

Usage:
  npx tsx scripts/fetch-all-photos.ts [options]

Options:
  --institution-id <id>    Fetch photos for a specific institution only
  --skip-existing          Skip employees who already have photos (default: false)
  --delay <ms>             Delay between requests in milliseconds (default: 100)
  --batch-size <n>         Number of employees to process (default: all)
  --dry-run                Show what would be done without making changes
  --help, -h               Show this help message

Examples:
  # Fetch photos for all institutions
  npx tsx scripts/fetch-all-photos.ts

  # Fetch photos for a specific institution
  npx tsx scripts/fetch-all-photos.ts --institution-id abc123

  # Skip employees who already have photos
  npx tsx scripts/fetch-all-photos.ts --skip-existing

  # Process only first 50 employees (for testing)
  npx tsx scripts/fetch-all-photos.ts --batch-size 50

  # Dry run to see what would happen
  npx tsx scripts/fetch-all-photos.ts --dry-run
  `);
}

interface PhotoData {
  buffer: Buffer;
  mimeType: string;
}

async function fetchPhotoFromHRIMS(payrollNumber: string): Promise<PhotoData | null> {
  try {
    const photoPayload = {
      RequestId: "203",
      SearchCriteria: payrollNumber
    };

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoPayload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HRIMS API error: ${response.status}`);
    }

    const photoData = await response.json();
    let photoBase64: string | null = null;

    // Extract photo from response - try different possible structures
    if (photoData.data && typeof photoData.data === 'string') {
      photoBase64 = photoData.data;
    } else if (photoData.photo && photoData.photo.content) {
      photoBase64 = photoData.photo.content;
    } else if (photoData.data && photoData.data.photo && photoData.data.photo.content) {
      photoBase64 = photoData.data.photo.content;
    } else if (photoData.data && photoData.data.Picture) {
      photoBase64 = photoData.data.Picture;
    } else if (photoData.Picture) {
      photoBase64 = photoData.Picture;
    }

    if (!photoBase64) {
      return null;
    }

    // Extract base64 data and mime type
    let base64Data = photoBase64;
    let mimeType = 'image/jpeg'; // default

    if (photoBase64.startsWith('data:image')) {
      const matches = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    // Convert to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    return { buffer, mimeType };
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Automated Photo Fetch Script\n');

  const options = parseArguments();

  console.log('📋 Configuration:');
  console.log(`   Institution ID: ${options.institutionId || 'All institutions'}`);
  console.log(`   Skip existing: ${options.skipExisting}`);
  console.log(`   Delay: ${options.delay}ms`);
  console.log(`   Batch size: ${options.batchSize || 'All'}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log();

  // Build where clause for institutions
  const institutionWhere = options.institutionId ? { id: options.institutionId } : {};

  // Fetch institutions
  const institutions = await prisma.institution.findMany({
    where: institutionWhere,
    select: {
      id: true,
      name: true,
      voteNumber: true,
      tinNumber: true
    }
  });

  if (institutions.length === 0) {
    console.log('❌ No institutions found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`📊 Found ${institutions.length} institution(s) to process\n`);

  const allResults: PhotoFetchResult[] = [];
  let totalProcessed = 0;

  for (const institution of institutions) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏢 Processing: ${institution.name}`);
    console.log(`${'='.repeat(80)}\n`);

    // Build where clause for employees
    const employeeWhere: any = {
      institutionId: institution.id
    };

    // Skip employees who already have photos if option is set
    if (options.skipExisting) {
      employeeWhere.AND = [
        {
          OR: [
            { profileImageUrl: null },
            {
              AND: [
                { profileImageUrl: { not: { startsWith: 'data:image' } } },
                { profileImageUrl: { not: { startsWith: '/api/files/employee-photos/' } } }
              ]
            }
          ]
        }
      ];
    }

    // Fetch employees from database
    let employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        profileImageUrl: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Apply batch size limit if specified
    if (options.batchSize && employees.length > options.batchSize - totalProcessed) {
      employees = employees.slice(0, options.batchSize - totalProcessed);
    }

    console.log(`👥 Found ${employees.length} employee(s) to process`);

    if (employees.length === 0) {
      console.log('   ℹ️  No employees need photo fetching\n');
      continue;
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const progress = `[${i + 1}/${employees.length}]`;

      if (!employee.payrollNumber) {
        console.log(`   ${progress} ⚠️  ${employee.name} - No payroll number`);
        allResults.push({
          employeeName: employee.name,
          payrollNumber: 'N/A',
          institutionName: institution.name,
          status: 'skipped',
          message: 'No payroll number'
        });
        skippedCount++;
        continue;
      }

      try {
        if (options.dryRun) {
          console.log(`   ${progress} 🔍 [DRY RUN] Would fetch photo for ${employee.name} (${employee.payrollNumber})`);
          allResults.push({
            employeeName: employee.name,
            payrollNumber: employee.payrollNumber,
            institutionName: institution.name,
            status: 'success',
            message: 'Dry run - not executed'
          });
          successCount++;
        } else {
          console.log(`   ${progress} 📸 Fetching photo for ${employee.name} (${employee.payrollNumber})...`);

          const photoData = await fetchPhotoFromHRIMS(employee.payrollNumber);

          if (!photoData) {
            console.log(`   ${progress} ❌ No photo data found for ${employee.name}`);
            allResults.push({
              employeeName: employee.name,
              payrollNumber: employee.payrollNumber,
              institutionName: institution.name,
              status: 'failed',
              message: 'No photo data in HRIMS response'
            });
            failedCount++;
          } else {
            // Determine file extension
            const extensionMap: { [key: string]: string } = {
              'image/jpeg': 'jpg',
              'image/jpg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp'
            };
            const extension = extensionMap[photoData.mimeType.toLowerCase()] || 'jpg';

            // Upload to MinIO
            const fileName = `${employee.id}.${extension}`;
            const filePath = `employee-photos/${fileName}`;

            try {
              await uploadFile(photoData.buffer, filePath, photoData.mimeType);

              // Store MinIO URL in database
              const minioUrl = `/api/files/employee-photos/${fileName}`;
              await prisma.employee.update({
                where: { id: employee.id },
                data: { profileImageUrl: minioUrl }
              });

              console.log(`   ${progress} ✅ Photo stored for ${employee.name} (MinIO)`);
              allResults.push({
                employeeName: employee.name,
                payrollNumber: employee.payrollNumber,
                institutionName: institution.name,
                status: 'success',
                message: 'Photo fetched and stored in MinIO'
              });
              successCount++;
            } catch (uploadError) {
              console.log(`   ${progress} ❌ Failed to upload to MinIO for ${employee.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
              allResults.push({
                employeeName: employee.name,
                payrollNumber: employee.payrollNumber,
                institutionName: institution.name,
                status: 'failed',
                message: `MinIO upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
              });
              failedCount++;
            }
          }

          // Add delay between requests to avoid overwhelming HRIMS API
          if (i < employees.length - 1) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
          }
        }
      } catch (error) {
        console.log(`   ${progress} ❌ Error for ${employee.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        allResults.push({
          employeeName: employee.name,
          payrollNumber: employee.payrollNumber,
          institutionName: institution.name,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
      }

      totalProcessed++;

      // Stop if batch size reached
      if (options.batchSize && totalProcessed >= options.batchSize) {
        console.log(`\n⚠️  Batch size limit (${options.batchSize}) reached. Stopping.`);
        break;
      }
    }

    console.log(`\n📊 Institution Summary for ${institution.name}:`);
    console.log(`   Total: ${employees.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);

    // Stop if batch size reached
    if (options.batchSize && totalProcessed >= options.batchSize) {
      break;
    }
  }

  // Final Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('🏁 FINAL SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  const finalSuccess = allResults.filter(r => r.status === 'success').length;
  const finalFailed = allResults.filter(r => r.status === 'failed').length;
  const finalSkipped = allResults.filter(r => r.status === 'skipped').length;

  console.log(`📊 Overall Statistics:`);
  console.log(`   Total Processed: ${allResults.length}`);
  console.log(`   ✅ Success: ${finalSuccess}`);
  console.log(`   ❌ Failed: ${finalFailed}`);
  console.log(`   ⚠️  Skipped: ${finalSkipped}`);

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `logs/photo-fetch-${timestamp}.json`;

  try {
    const fs = await import('fs');
    const path = await import('path');

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(process.cwd(), resultsFile),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        options,
        summary: {
          total: allResults.length,
          success: finalSuccess,
          failed: finalFailed,
          skipped: finalSkipped
        },
        results: allResults
      }, null, 2)
    );

    console.log(`\n💾 Results saved to: ${resultsFile}`);
  } catch (error) {
    console.error('⚠️  Could not save results to file:', error);
  }

  console.log('\n✨ Script completed!\n');

  await prisma.$disconnect();
}

// Run the script
main()
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
