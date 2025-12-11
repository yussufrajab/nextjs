import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Fetch employee from database to get payroll number
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        payrollNumber: true,
        profileImageUrl: true,
        name: true
      }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      );
    }

    if (!employee.payrollNumber) {
      return NextResponse.json(
        { success: false, message: 'Employee does not have a payroll number' },
        { status: 400 }
      );
    }

    // Check if photo already exists (either base64 or MinIO URL)
    if (employee.profileImageUrl &&
        (employee.profileImageUrl.startsWith('data:image') ||
         employee.profileImageUrl.startsWith('/api/files/employee-photos/'))) {
      return NextResponse.json({
        success: true,
        message: 'Photo already exists',
        data: {
          employeeId: employee.id,
          employeeName: employee.name,
          photoUrl: employee.profileImageUrl,
          alreadyExists: true
        }
      });
    }

    console.log(`📸 Fetching photo for employee ${employee.name} (Payroll: ${employee.payrollNumber})`);

    // Fetch photo from HRIMS using the new configuration
    const photoPayload = {
      RequestId: "203",
      SearchCriteria: employee.payrollNumber
    };

    const hrimsResponse = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoPayload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!hrimsResponse.ok) {
      console.error(`❌ HRIMS API error: ${hrimsResponse.status} ${hrimsResponse.statusText}`);
      return NextResponse.json(
        {
          success: false,
          message: `HRIMS API returned error: ${hrimsResponse.status}`,
          error: hrimsResponse.statusText
        },
        { status: 502 }
      );
    }

    const hrimsData = await hrimsResponse.json();
    console.log('✅ Received response from HRIMS');
    console.log('HRIMS Response structure:', JSON.stringify(hrimsData).substring(0, 500));

    // Extract photo data from response
    // The response structure may vary, adjust according to actual HRIMS response
    let photoBase64: string | null = null;

    // Try different possible response structures
    if (hrimsData.photo && hrimsData.photo.content) {
      console.log('Found photo at: hrimsData.photo.content');
      photoBase64 = hrimsData.photo.content;
    } else if (hrimsData.data && hrimsData.data.photo && hrimsData.data.photo.content) {
      console.log('Found photo at: hrimsData.data.photo.content');
      photoBase64 = hrimsData.data.photo.content;
    } else if (hrimsData.data && typeof hrimsData.data === 'string') {
      console.log('Found photo at: hrimsData.data (string)');
      photoBase64 = hrimsData.data;
    } else if (typeof hrimsData === 'string') {
      console.log('Found photo as direct string');
      photoBase64 = hrimsData;
    } else if (hrimsData.data && hrimsData.data.Picture) {
      console.log('Found photo at: hrimsData.data.Picture');
      photoBase64 = hrimsData.data.Picture;
    } else if (hrimsData.Picture) {
      console.log('Found photo at: hrimsData.Picture');
      photoBase64 = hrimsData.Picture;
    }

    if (!photoBase64) {
      console.log('⚠️ No photo data found in HRIMS response');
      console.log('Response keys:', Object.keys(hrimsData));
      if (hrimsData.data) {
        console.log('Data keys:', Object.keys(hrimsData.data));
      }
      return NextResponse.json({
        success: false,
        message: 'No photo data found in HRIMS response',
        hrimsResponse: hrimsData,
        availableKeys: Object.keys(hrimsData),
        dataKeys: hrimsData.data ? Object.keys(hrimsData.data) : null
      }, { status: 404 });
    }

    console.log(`💾 Storing photo for employee ${employee.name} to MinIO...`);

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
    const fileName = `${employee.id}.${extension}`;
    const filePath = `employee-photos/${fileName}`;

    try {
      await uploadFile(photoBuffer, filePath, mimeType);
      console.log(`✅ Photo uploaded to MinIO: ${filePath}`);
    } catch (uploadError) {
      console.error('❌ Failed to upload to MinIO:', uploadError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to upload photo to storage',
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Store MinIO URL in database
    const minioUrl = `/api/files/employee-photos/${fileName}`;

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        profileImageUrl: minioUrl
      }
    });

    console.log(`✅ Photo stored successfully for employee ${employee.name}`);

    return NextResponse.json({
      success: true,
      message: 'Photo fetched and stored successfully',
      data: {
        employeeId: updatedEmployee.id,
        employeeName: employee.name,
        photoUrl: updatedEmployee.profileImageUrl,
        photoSize: photoBuffer.length
      }
    });

  } catch (error) {
    console.error('🚨 Error fetching photo from HRIMS:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch photo from HRIMS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
