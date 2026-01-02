import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  console.log('✅ PATCH request received!');
  const body = await req.json();
  console.log('Body:', body);
  return NextResponse.json({ success: true, message: 'PATCH works', body });
}

export async function PUT(req: Request) {
  console.log('✅ PUT request received!');
  const body = await req.json();
  console.log('Body:', body);
  return NextResponse.json({ success: true, message: 'PUT works', body });
}
