import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: institutionId } = await params;

    // Fetch institution
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        manualEntryEnabled: true,
        manualEntryStartDate: true,
        manualEntryEndDate: true,
      },
    });

    if (!institution) {
      const response = NextResponse.json(
        { success: false, error: 'Institution not found' },
        { status: 404 }
      );
      // Prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const now = new Date();
    let isWithinTimeWindow = true;

    // Check if we're within the time window
    if (institution.manualEntryStartDate && institution.manualEntryEndDate) {
      isWithinTimeWindow =
        now >= institution.manualEntryStartDate &&
        now <= institution.manualEntryEndDate;
    } else if (institution.manualEntryStartDate) {
      // Only start date set - must be after start
      isWithinTimeWindow = now >= institution.manualEntryStartDate;
    } else if (institution.manualEntryEndDate) {
      // Only end date set - must be before end
      isWithinTimeWindow = now <= institution.manualEntryEndDate;
    }

    const hasPermission =
      institution.manualEntryEnabled && isWithinTimeWindow;

    const response = NextResponse.json({
      success: true,
      data: {
        hasPermission,
        enabled: institution.manualEntryEnabled,
        startDate: institution.manualEntryStartDate?.toISOString() || null,
        endDate: institution.manualEntryEndDate?.toISOString() || null,
        isWithinTimeWindow,
      },
    });
    // Prevent caching - this data needs to be fresh
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('Error checking manual entry permission:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
}
