import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const zanId = searchParams.get('zanId');
    const q = searchParams.get('q');

    console.log('Employee search API called with:', { zanId, q });

    if (!zanId && !q) {
      return NextResponse.json({ 
        success: false, 
        message: 'Either zanId or q parameter is required' 
      }, { status: 400 });
    }

    let whereClause: any = {};

    if (zanId) {
      whereClause.zanId = zanId;
    } else if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { zanId: { contains: q, mode: 'insensitive' } }
      ];
    }

    const employees = await db.employee.findMany({
      where: whereClause,
      include: {
        institution: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }).catch(() => []);

    console.log(`Found ${employees.length} employees matching search criteria`);

    return NextResponse.json({
      success: true,
      data: employees
    });

  } catch (error) {
    console.error("[EMPLOYEES_SEARCH_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}