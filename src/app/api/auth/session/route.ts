import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // For now, just return a success response
    // In a real app, you'd check the session/cookies here
    return NextResponse.json({ 
      success: true, 
      data: { isAuthenticated: true } 
    });
  } catch (error) {
    console.error("[SESSION_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}