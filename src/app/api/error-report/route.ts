import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const errorReportSchema = z.object({
  message: z.string().min(1).max(1000),
  digest: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = errorReportSchema.parse(body);

    logger.error(
      {
        clientError: true,
        message: parsed.message,
        digest: parsed.digest,
        url: parsed.url,
        userAgent: parsed.userAgent,
      },
      'Client-side error reported',
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid error report' },
      { status: 400 },
    );
  }
}
