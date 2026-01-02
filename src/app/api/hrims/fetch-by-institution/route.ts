import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addHRIMSSyncJob } from '@/lib/jobs/hrims-sync-queue';

// Configure route
export const dynamic = 'force-dynamic';

/**
 * POST /api/hrims/fetch-by-institution
 *
 * Queue a background job to sync HRIMS data for an institution
 * Returns immediately with a job ID for progress tracking
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      identifierType,
      voteNumber,
      tinNumber,
      institutionId,
      pageSize = 100,
    } = body;

    // Validation
    if (!identifierType || !['votecode', 'tin'].includes(identifierType)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Valid identifier type must be provided (votecode or tin)',
        },
        { status: 400 }
      );
    }

    if (!institutionId) {
      return NextResponse.json(
        { success: false, message: 'Institution ID is required' },
        { status: 400 }
      );
    }

    // Verify institution exists
    const institution = await db.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      return NextResponse.json(
        { success: false, message: 'Institution not found' },
        { status: 404 }
      );
    }

    // Determine identifier and request ID based on type
    let requestId: string;
    let identifier: string;
    let identifierLabel: string;

    if (identifierType === 'tin') {
      if (!tinNumber) {
        return NextResponse.json(
          {
            success: false,
            message: 'TIN number is required for the selected identifier type',
          },
          { status: 400 }
        );
      }
      requestId = '205';
      identifier = tinNumber;
      identifierLabel = 'TIN';
    } else {
      if (!voteNumber) {
        return NextResponse.json(
          {
            success: false,
            message: 'Vote number is required for the selected identifier type',
          },
          { status: 400 }
        );
      }
      requestId = '204';
      identifier = voteNumber;
      identifierLabel = 'Vote Code';
    }

    // Create and queue the background job
    const jobId = await addHRIMSSyncJob({
      institutionId,
      institutionName: institution.name,
      identifierType,
      voteNumber,
      tinNumber,
      identifier,
      identifierLabel,
      requestId,
      pageSize,
    });

    console.log(`✅ HRIMS sync job queued: ${jobId} for ${institution.name}`);

    // Return job ID immediately (non-blocking)
    return NextResponse.json({
      success: true,
      message: `HRIMS sync job queued for ${institution.name}`,
      jobId,
      institutionName: institution.name,
      statusUrl: `/api/hrims/sync-status/${jobId}`,
    });
  } catch (error) {
    console.error('Error queueing HRIMS sync job:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
