/**
 * Workflow access-denial audit helper (Req 15.7 / 17.6).
 *
 * The `[id]` workflow routes (promotions, confirmations, lwop, termination,
 * retirement, cadre-change, resignation, service-extension) historically
 * returned 403/400 on institution-ownership, self-approval, role-gating, and
 * FSM-transition denials WITHOUT writing to the tamper-evident audit trail —
 * so a denied attempt to act on another institution's request, approve one's
 * own submission, or jump a workflow stage was invisible to SOC review.
 *
 * `denyWorkflowAccess` logs the denial via `logAccessDenied` (ACCESS_DENIED
 * event, WARNING) and returns the denial response, so every `[id]` 403 path
 * reaches the audit trail. Use the `status` option to also cover the FSM
 * invalid-transition 400 (a denied stage-jump attempt).
 */

import { NextResponse } from 'next/server';
import { logAccessDenied, safeAuditLog } from '@/lib/audit-logger';

export interface WorkflowActor {
  userId: string | null;
  username: string | null;
  role: string | null;
}

export interface DenyWorkflowAccessArgs {
  /** Authenticated actor driving the request. */
  auth: WorkflowActor;
  /** Route base, e.g. "promotions" — builds attemptedRoute `/api/{routeBase}/{requestId}`. */
  routeBase: string;
  /** The request id from the URL path. */
  requestId: string;
  /** Human-readable request type for audit context, e.g. "Promotion". */
  requestType: string;
  /** Owning employee id, when known, for forensic context. */
  employeeId?: string | null;
  /** Short machine-readable reason code, e.g. "INSTITUTION_OWNERSHIP". */
  blockReason: string;
  /** Human-readable message returned to the client. */
  message: string;
  /** HTTP status to return. Defaults to 403; pass 400 for FSM-transition denials. */
  status?: number;
  /** HTTP method for the audit row. Defaults to "PATCH". */
  requestMethod?: string;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  additionalData?: Record<string, any>;
}

/**
 * Log a workflow access denial to the audit trail and return the denial
 * response. Await this at every `[id]` 403/FSM-400 site.
 */
export async function denyWorkflowAccess(
  args: DenyWorkflowAccessArgs
): Promise<NextResponse> {
  const status = args.status ?? 403;
  await safeAuditLog(
    logAccessDenied({
      userId: args.auth.userId,
      username: args.auth.username,
      userRole: args.auth.role,
      attemptedRoute: `/api/${args.routeBase}/${args.requestId}`,
      blockReason: args.blockReason,
      ipAddress: args.ipAddress,
      deviceInfo: args.deviceInfo,
      requestMethod: args.requestMethod ?? 'PATCH',
      additionalData: {
        requestType: args.requestType,
        requestId: args.requestId,
        employeeId: args.employeeId ?? null,
        ...args.additionalData,
      },
    }),
    `workflow-denial:${args.routeBase}`
  );
  return NextResponse.json({ success: false, message: args.message }, { status });
}