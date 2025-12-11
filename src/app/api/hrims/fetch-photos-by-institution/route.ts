import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

interface PhotoFetchResult {
  employeeName: string;
  payrollNumber: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { institutionId } = body;

    if (!institutionId) {
      return NextResponse.json({
        success: false,
        message: 'Institution ID is required'
      }, { status: 400 });
    }

    console.log('📸 Starting bulk photo fetch for institution:', institutionId);

    // Step 1: Fetch all employees from DATABASE for this institution
    console.log(`📋 Step 1: Fetching employee list from database...`);

    const employees = await prisma.employee.findMany({
      where: {
        institutionId: institutionId
      },
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        profileImageUrl: true
      }
    });

    console.log(`📊 Total employees found in database: ${employees.length}`);

    if (employees.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No employees found for this institution in database'
      }, { status: 404 });
    }

    // Step 2: Fetch and store photos for each employee using RequestId 203
    console.log(`📸 Step 2: Fetching photos for ${employees.length} employees using RequestId 203...`);
    const results: PhotoFetchResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      const { id, name, payrollNumber, profileImageUrl } = employee;

      if (!payrollNumber) {
        results.push({
          employeeName: name,
          payrollNumber: 'N/A',
          status: 'skipped',
          message: 'No payroll number'
        });
        skippedCount++;
        continue;
      }

      // Check if photo already exists (either base64 or MinIO URL)
      if (profileImageUrl &&
          (profileImageUrl.startsWith('data:image') ||
           profileImageUrl.startsWith('/api/files/employee-photos/'))) {
        results.push({
          employeeName: name,
          payrollNumber,
          status: 'skipped',
          message: 'Photo already exists in storage'
        });
        skippedCount++;
        continue;
      }

      // Fetch photo from HRIMS using RequestId 203
      try {
        console.log(`📸 Fetching photo for ${name} (Payroll: ${payrollNumber})`);

        const photoPayload = {
          RequestId: "203",
          SearchCriteria: payrollNumber
        };

        const photoResponse = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
          method: 'POST',
          headers: {
            'ApiKey': HRIMS_CONFIG.API_KEY,
            'Token': HRIMS_CONFIG.TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(photoPayload),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!photoResponse.ok) {
          results.push({
            employeeName: name,
            payrollNumber,
            status: 'failed',
            message: `HRIMS API error: ${photoResponse.status}`
          });
          failedCount++;
          continue;
        }

        const photoData = await photoResponse.json();
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
          results.push({
            employeeName: name,
            payrollNumber,
            status: 'failed',
            message: 'No photo data in HRIMS response'
          });
          failedCount++;
          continue;
        }

        // Convert base64 to buffer
        let base64Data = photoBase64;
        let mimeType = 'image/jpeg'; // default

        // Extract base64 data if it has data URI prefix
        if (photoBase64.startsWith('data:image')) {
          const matches = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
          }
        }

        const photoBuffer = Buffer.from(base64Data, 'base64');

        // Determine file extension
        const extensionMap: { [key: string]: string } = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp'
        };
        const extension = extensionMap[mimeType.toLowerCase()] || 'jpg';

        // Upload to MinIO
        const fileName = `${id}.${extension}`;
        const filePath = `employee-photos/${fileName}`;

        try {
          await uploadFile(photoBuffer, filePath, mimeType);
          console.log(`💾 Photo uploaded to MinIO: ${filePath}`);
        } catch (uploadError) {
          console.error(`❌ Failed to upload photo to MinIO for ${name}:`, uploadError);
          results.push({
            employeeName: name,
            payrollNumber,
            status: 'failed',
            message: 'Failed to upload photo to storage'
          });
          failedCount++;
          continue;
        }

        // Store MinIO URL in database
        const minioUrl = `/api/files/employee-photos/${fileName}`;

        await prisma.employee.update({
          where: { id: id },
          data: { profileImageUrl: minioUrl }
        });

        results.push({
          employeeName: name,
          payrollNumber,
          status: 'success',
          message: 'Photo fetched and stored in MinIO'
        });
        successCount++;

        console.log(`✅ Photo stored in MinIO for ${name} (${payrollNumber})`);

      } catch (error) {
        results.push({
          employeeName: name,
          payrollNumber,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
        console.error(`❌ Failed to fetch photo for ${name}:`, error);
      }

      // Add a small delay to avoid overwhelming the HRIMS API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      total: employees.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount
    };

    console.log(`🏁 Photo fetch complete. Summary:`, summary);

    return NextResponse.json({
      success: true,
      message: 'Photo fetch completed',
      data: {
        summary,
        results
      }
    });

  } catch (error) {
    console.error('🚨 Error in bulk photo fetch:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch photos',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
