import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    console.log('Institutions API called');

    const institutions = await db.institution.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${institutions.length} institutions`);

    return NextResponse.json({
      success: true,
      data: institutions
    });
  } catch (error) {
    console.error("[INSTITUTIONS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}