import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { objectKey: string[] } }
) {
  try {
    // Reconstruct the object key from the dynamic route segments
    const objectKey = decodeURIComponent(params.objectKey.join('/'));
    
    console.log('Preview API - Object key segments:', params.objectKey);
    console.log('Preview API - Reconstructed object key:', objectKey);
    console.log('Preview API - Original URL segments:', params.objectKey.map(s => decodeURIComponent(s)));
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const expiry = searchParams.get('expiry') || '60';
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    // Forward the request to the Spring Boot backend
    // Don't encode the objectKey as the backend will decode it
    const backendUrl = `http://localhost:8080/api/files/preview/${objectKey}?expiry=${expiry}`;
    console.log('Preview API - Backend URL:', backendUrl);
    
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {})
      }
    });

    // Check if response is JSON before parsing
    let responseData;
    const contentType = backendResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await backendResponse.json();
    } else {
      // Non-JSON response (likely HTML error page)
      const text = await backendResponse.text();
      console.error('Non-JSON response from backend preview:', text);
      return NextResponse.json(
        { success: false, message: 'Backend error', details: text.substring(0, 200) },
        { status: backendResponse.status }
      );
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        responseData,
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('File preview proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}