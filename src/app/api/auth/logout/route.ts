import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // For session-based auth, we would typically destroy the session here
    // Since we're using localStorage for persistence, we just return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error("[LOGOUT_POST]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}