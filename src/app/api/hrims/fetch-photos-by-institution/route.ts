import { NextRequest, NextResponse } from 'next/server';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

// Configure route for long-running operations
export const maxDuration = 300; // 5 minutes (increase if needed)
export const dynamic = 'force-dynamic';

interface PhotoFetchResult {
  employeeName: string;
  payrollNumber: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const HRIMS_CONFIG = await getHrimsApiConfig();
    const body = await request.json();
    const { institutionId } = body;

    if (!institutionId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Institution ID is required',
        },
        { status: 400 }
      );
    }

    console.log('📸 Starting bulk photo fetch for institution:', institutionId);

    // Fetch all employees from database for this institution
    const employees = await prisma.employee.findMany({
      where: {
        institutionId: institutionId,
      },
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        profileImageUrl: true,
      },
    });

    console.log(`📊 Total employees found in database: ${employees.length}`);

    if (employees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No employees found for this institution in database',
        },
        { status: 404 }
      );
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const results: PhotoFetchResult[] = [];
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        // Send initial progress update
        const initialData = {
          type: 'progress',
          current: 0,
          total: employees.length,
          message: 'Starting photo fetch...',
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
        );

        // Process each employee
        for (let i = 0; i < employees.length; i++) {
          const employee = employees[i];
          const { id, name, payrollNumber, profileImageUrl } = employee;

          if (!payrollNumber) {
            results.push({
              employeeName: name,
              payrollNumber: 'N/A',
              status: 'skipped',
              message: 'No payroll number',
            });
            skippedCount++;

            // Send progress update
            const progressData = {
              type: 'progress',
              current: i + 1,
              total: employees.length,
              employee: name,
              status: 'skipped',
              message: 'No payroll number',
              summary: {
                success: successCount,
                failed: failedCount,
                skipped: skippedCount,
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
            );
            continue;
          }

          // Check if photo already exists
          if (
            profileImageUrl &&
            (profileImageUrl.startsWith('data:image') ||
              profileImageUrl.startsWith('/api/files/employee-photos/'))
          ) {
            results.push({
              employeeName: name,
              payrollNumber,
              status: 'skipped',
              message: 'Photo already exists in storage',
            });
            skippedCount++;

            // Send progress update
            const progressData = {
              type: 'progress',
              current: i + 1,
              total: employees.length,
              employee: name,
              status: 'skipped',
              message: 'Photo already exists',
              summary: {
                success: successCount,
                failed: failedCount,
                skipped: skippedCount,
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
            );
            continue;
          }

          // Fetch photo from HRIMS
          try {
            console.log(
              `📸 Fetching photo for ${name} (Payroll: ${payrollNumber})`
            );

            const photoPayload = {
              RequestId: '203',
              SearchCriteria: payrollNumber,
            };

            const photoResponse = await fetch(
              `${HRIMS_CONFIG.BASE_URL}/Employees`,
              {
                method: 'POST',
                headers: {
                  ApiKey: HRIMS_CONFIG.API_KEY,
                  Token: HRIMS_CONFIG.TOKEN,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(photoPayload),
                signal: AbortSignal.timeout(30000),
              }
            );

            if (!photoResponse.ok) {
              results.push({
                employeeName: name,
                payrollNumber,
                status: 'failed',
                message: `HRIMS API error: ${photoResponse.status}`,
              });
              failedCount++;

              // Send progress update
              const progressData = {
                type: 'progress',
                current: i + 1,
                total: employees.length,
                employee: name,
                status: 'failed',
                message: `HRIMS API error: ${photoResponse.status}`,
                summary: {
                  success: successCount,
                  failed: failedCount,
                  skipped: skippedCount,
                },
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
              );
              continue;
            }

            const photoData = await photoResponse.json();
            let photoBase64: string | null = null;

            // Extract photo from response
            if (photoData.data && typeof photoData.data === 'string') {
              photoBase64 = photoData.data;
            } else if (photoData.photo && photoData.photo.content) {
              photoBase64 = photoData.photo.content;
            } else if (
              photoData.data &&
              photoData.data.photo &&
              photoData.data.photo.content
            ) {
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
                message: 'No photo data in HRIMS response',
              });
              failedCount++;

              // Send progress update
              const progressData = {
                type: 'progress',
                current: i + 1,
                total: employees.length,
                employee: name,
                status: 'failed',
                message: 'No photo data in HRIMS response',
                summary: {
                  success: successCount,
                  failed: failedCount,
                  skipped: skippedCount,
                },
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
              );
              continue;
            }

            // Convert base64 to buffer
            let base64Data = photoBase64;
            let mimeType = 'image/jpeg';

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
              'image/webp': 'webp',
            };
            const extension = extensionMap[mimeType.toLowerCase()] || 'jpg';

            // Upload to MinIO
            const fileName = `${id}.${extension}`;
            const filePath = `employee-photos/${fileName}`;

            try {
              await uploadFile(photoBuffer, filePath, mimeType);
              console.log(`💾 Photo uploaded to MinIO: ${filePath}`);
            } catch (uploadError) {
              console.error(
                `❌ Failed to upload photo to MinIO for ${name}:`,
                uploadError
              );
              results.push({
                employeeName: name,
                payrollNumber,
                status: 'failed',
                message: 'Failed to upload photo to storage',
              });
              failedCount++;

              // Send progress update
              const progressData = {
                type: 'progress',
                current: i + 1,
                total: employees.length,
                employee: name,
                status: 'failed',
                message: 'Failed to upload photo to storage',
                summary: {
                  success: successCount,
                  failed: failedCount,
                  skipped: skippedCount,
                },
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
              );
              continue;
            }

            // Store MinIO URL in database
            const minioUrl = `/api/files/employee-photos/${fileName}`;

            await prisma.employee.update({
              where: { id: id },
              data: { profileImageUrl: minioUrl },
            });

            results.push({
              employeeName: name,
              payrollNumber,
              status: 'success',
              message: 'Photo fetched and stored in MinIO',
            });
            successCount++;

            console.log(
              `✅ Photo stored in MinIO for ${name} (${payrollNumber})`
            );

            // Send progress update
            const progressData = {
              type: 'progress',
              current: i + 1,
              total: employees.length,
              employee: name,
              status: 'success',
              message: 'Photo stored successfully',
              summary: {
                success: successCount,
                failed: failedCount,
                skipped: skippedCount,
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
            );
          } catch (error) {
            results.push({
              employeeName: name,
              payrollNumber,
              status: 'failed',
              message: error instanceof Error ? error.message : 'Unknown error',
            });
            failedCount++;
            console.error(`❌ Failed to fetch photo for ${name}:`, error);

            // Send progress update
            const progressData = {
              type: 'progress',
              current: i + 1,
              total: employees.length,
              employee: name,
              status: 'failed',
              message: error instanceof Error ? error.message : 'Unknown error',
              summary: {
                success: successCount,
                failed: failedCount,
                skipped: skippedCount,
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
            );
          }

          // Add a small delay to avoid overwhelming the HRIMS API
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const summary = {
          total: employees.length,
          success: successCount,
          failed: failedCount,
          skipped: skippedCount,
        };

        console.log(`🏁 Photo fetch complete. Summary:`, summary);

        // Send final result
        const finalData = {
          type: 'complete',
          success: true,
          message: 'Photo fetch completed',
          data: {
            summary,
            results,
          },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('🚨 Error in bulk photo fetch:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch photos',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
