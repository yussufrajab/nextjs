import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the multipart form data
    const formData = await request.formData();
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    // Forward the request to the Spring Boot backend
    const backendResponse = await fetch(
      `http://localhost:8080/api/files/upload`,
      {
        method: 'POST',
        headers: {
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: formData
      }
    );

    const responseData = await backendResponse.json();

    return NextResponse.json(
      responseData,
      { status: backendResponse.status }
    );

  } catch (error) {
    console.error('File upload proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}