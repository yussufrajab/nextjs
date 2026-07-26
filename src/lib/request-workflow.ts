/**
 * Status workflow FSM for the HRRP → Commission request types
 * (confirmations, lwop, promotions, cadre-change, service-extension,
 * resignation, termination, retirement).
 *
 * SECURITY (Req 8.1 / 8.2 / 18.1): prevents a client from jumping an
 * arbitrary status — e.g. re-approving an already Commission-concluded request,
 * skipping the HRRP stage, or moving backwards out of a terminal state.
 *
 * Canonical statuses:
 *  - 'Pending HRRP Review'
 *  - 'Approved by HRRP - Awaiting Commission Review'
 *  - 'Rejected by HRRP - Awaiting HRO Correction'
 *  - 'Approved by Commission' (terminal)
 *  - 'Rejected by Commission - Request Concluded' (terminal)
 *
 * Plus the variable HHRMD/HRMO forward status, which contains the substring
 * 'Awaiting Commission Decision' (e.g. 'Approved by HHRMD – Awaiting Commission
 * Decision', 'Request Received – Awaiting Commission Decision'). The forward
 * status spelling varies by forwarding role and dash style (en-dash vs hyphen),
 * so it is matched by substring — mirroring how the collection PATCH handlers
 * detect a forward (`status.includes('Awaiting Commission Decision')`).
 */

const TERMINAL_STATUSES = [
  'Approved by Commission',
  'Rejected by Commission - Request Concluded',
];

/**
 * Returns true if a request may move from `fromStatus` to `toStatus`.
 * A no-op transition (from === to) is allowed.
 */
export function isAllowedStatusTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  if (fromStatus === toStatus) return true;

  // Terminal states are final — no transitions out (prevents re-approving a
  // concluded request).
  if (TERMINAL_STATUSES.includes(fromStatus)) return false;

  // Pending HRRP Review → HRRP approve / reject only.
  if (fromStatus === 'Pending HRRP Review') {
    return (
      toStatus === 'Approved by HRRP - Awaiting Commission Review' ||
      toStatus === 'Rejected by HRRP - Awaiting HRO Correction'
    );
  }

  // HRRP-approved → HHRMD/HRMO forward to Commission (variable status), a
  // direct Commission decision, or a return-to-HRO rejection by the reviewing
  // role (the dashboard's "Reject & Return to HRO" button sends a variable
  // `Rejected by {HRRP|HRMO|HHRMD} - Awaiting HRO Correction` status from this
  // state — matched by the shared `Awaiting HRO Correction` substring).
  // Terminal Commission states remain the only locked outcomes (above).
  if (fromStatus === 'Approved by HRRP - Awaiting Commission Review') {
    return (
      toStatus.includes('Awaiting Commission Decision') ||
      toStatus === 'Approved by Commission' ||
      toStatus === 'Rejected by Commission - Request Concluded' ||
      toStatus.includes('Awaiting HRO Correction')
    );
  }

  // Forwarded / Awaiting Commission Decision → Commission decision only, or a
  // return-to-HRO rejection by the reviewing role (Commission-stage "Reject &
  // Return to HRO": the reviewer sends an incomplete request back to the HRO
  // for correction instead of concluding it). Terminal Commission states remain
  // the only locked outcomes (above).
  if (fromStatus.includes('Awaiting Commission Decision')) {
    return (
      toStatus === 'Approved by Commission' ||
      toStatus === 'Rejected by Commission - Request Concluded' ||
      toStatus.includes('Awaiting HRO Correction')
    );
  }

  // HRRP-rejected → resubmit back to Pending.
  if (fromStatus === 'Rejected by HRRP - Awaiting HRO Correction') {
    return toStatus === 'Pending HRRP Review';
  }

  // Unknown source status (legacy/pre-FSM rows): allow the transition rather
  // than block a legitimate workflow action on data we don't recognize.
  return true;
}