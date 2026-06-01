import { NextResponse } from 'next/server';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const POST = wrapHandler(async (request: Request) => {
  // CSP reports may use application/csp-report content type, not JSON
  let report: any = null;
  try {
    const body = await request.json();
    report = body['csp-report'];
  } catch {
    // Not JSON or no body — still return 204 per CSP spec
  }

  if (report) {
    authLogger.warn(
      {
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        documentUri: report['document-uri'],
        scriptSample: report['script-sample']?.substring(0, 100),
      },
      'CSP violation report received'
    );
  }

  return new NextResponse(null, { status: 204 });
}, 'csp-report');
