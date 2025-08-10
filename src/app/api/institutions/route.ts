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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Institution name is required and must be a non-empty string'
      }, { status: 400 });
    }

    // Check if institution with the same name already exists
    const existingInstitution = await db.institution.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (existingInstitution) {
      return NextResponse.json({
        success: false,
        message: 'An institution with this name already exists'
      }, { status: 409 });
    }

    const newInstitution = await db.institution.create({
      data: {
        name: name.trim()
      }
    });

    console.log('Created new institution:', newInstitution);

    return NextResponse.json({
      success: true,
      data: newInstitution,
      message: 'Institution created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error("[INSTITUTIONS_POST]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}