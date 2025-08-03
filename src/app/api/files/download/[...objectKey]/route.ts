import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { objectKey: string[] } }
) {
  try {
    // Reconstruct the object key from the dynamic route segments
    const objectKey = decodeURIComponent(params.objectKey.join('/'));
    
    console.log('Download API - Object key segments:', params.objectKey);
    console.log('Download API - Reconstructed object key:', objectKey);
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    // Forward the request to the Spring Boot backend
    const backendResponse = await fetch(
      `http://localhost:8080/api/files/download/${objectKey}`,
      {
        method: 'GET',
        headers: {
          ...(authHeader ? { 'Authorization': authHeader } : {})
        }
      }
    );

    if (!backendResponse.ok) {
      // Check if response is JSON
      const contentType = backendResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await backendResponse.json();
          return NextResponse.json(errorData, { status: backendResponse.status });
        } catch (e) {
          return NextResponse.json(
            { success: false, message: 'Failed to parse error response' },
            { status: backendResponse.status }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, message: 'File not found or access denied' },
          { status: backendResponse.status }
        );
      }
    }

    // Stream the file response
    const fileStream = backendResponse.body;
    const headers = new Headers();
    
    // Copy relevant headers from backend response
    const contentType = backendResponse.headers.get('content-type');
    const contentDisposition = backendResponse.headers.get('content-disposition');
    
    if (contentType) headers.set('content-type', contentType);
    if (contentDisposition) headers.set('content-disposition', contentDisposition);

    return new NextResponse(fileStream, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('File download proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}