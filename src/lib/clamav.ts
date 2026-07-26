import net from 'net';
import { logger } from '@/lib/logger';

/**
 * ClamAV TCP client using the INSTREAM protocol for malware scanning.
 *
 * Environment variables:
 * - CLAMAV_HOST     (default: "localhost")
 * - CLAMAV_PORT     (default: 3310)
 * - CLAMAV_TIMEOUT  (default: 30000 ms)
 * - CLAMAV_ENABLED  (default: "true", set to "false" to skip scanning)
 *
 * SECURITY (Req 10.7): in production, `CLAMAV_ENABLED=false` alone is IGNORED
 * so a stray/maliciously-set env var cannot silently turn off malware scanning
 * for user uploads. To actually disable scanning in production you must ALSO
 * set `CLAMAV_DISABLE_ALLOWED=true` — a deliberate, ops-only two-key action
 * (the "admin gate"). The dev/CI escape hatch (`CLAMAV_ENABLED=false` alone)
 * still works outside production where ClamAV typically isn't running.
 */

const CLAMAV_HOST = process.env.CLAMAV_HOST ?? 'localhost';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT ?? '3310', 10);
const CLAMAV_TIMEOUT = parseInt(process.env.CLAMAV_TIMEOUT ?? '30000', 10);
const CLAMAV_ENABLED = process.env.CLAMAV_ENABLED ?? 'true';
const CLAMAV_DISABLE_ALLOWED = process.env.CLAMAV_DISABLE_ALLOWED ?? 'false';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

const MAX_CHUNK_SIZE = 2048; // ClamAV INSTREAM max chunk size in bytes

const clamavLogger = logger.child({ component: 'clamav' });

export interface ClamAVResult {
  isClean: boolean;
  virusName?: string;
  error?: string;
}

/**
 * Resolve once at module load whether ClamAV scanning is active, applying the
 * production two-key disable gate (Req 10.7). Logs the decision once so a
 * disabled/ignored disable is visible to operators.
 */
function resolveClamAVEnabled(): boolean {
  const wantEnabled = CLAMAV_ENABLED.toLowerCase() !== 'false';
  if (wantEnabled) return true;

  // Disable requested. In production, require the explicit override so a
  // single stray env var cannot silently turn off malware scanning.
  if (
    NODE_ENV === 'production' &&
    CLAMAV_DISABLE_ALLOWED.toLowerCase() !== 'true'
  ) {
    clamavLogger.warn(
      { CLAMAV_ENABLED, NODE_ENV },
      'CLAMAV_ENABLED=false ignored in production without CLAMAV_DISABLE_ALLOWED=true — malware scanning remains ON'
    );
    return true;
  }

  clamavLogger.warn(
    { CLAMAV_ENABLED, CLAMAV_DISABLE_ALLOWED, NODE_ENV },
    'ClamAV malware scanning DISABLED via env — uploads/HRIMS content will NOT be scanned'
  );
  return false;
}

const CLAMAV_SCANNING_ENABLED = resolveClamAVEnabled();

/**
 * Returns whether ClamAV scanning is enabled. In production, a bare
 * `CLAMAV_ENABLED=false` is ignored unless `CLAMAV_DISABLE_ALLOWED=true`.
 */
export function isClamAVEnabled(): boolean {
  return CLAMAV_SCANNING_ENABLED;
}

/**
 * Scans a file buffer for malware using ClamAV's INSTREAM protocol.
 *
 * Protocol flow:
 *   1. Connect to ClamAV TCP socket
 *   2. Send "nINSTREAM\n" command
 *   3. Send buffer in chunks (4-byte big-endian length prefix + data)
 *   4. Send 0-length chunk to signal end
 *   5. Read response for "OK" or "FOUND"
 *   6. Close connection
 *
 * Fail-closed policy: if ClamAV is enabled but unreachable, returns
 * `{ isClean: false, error: ... }`. If disabled, returns `{ isClean: true }`.
 */
export function scanFile(buffer: Buffer): Promise<ClamAVResult> {
  if (!isClamAVEnabled()) {
    return Promise.resolve({ isClean: true });
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(CLAMAV_TIMEOUT);

    let responseData = '';

    socket.on('data', (data: Buffer) => {
      responseData += data.toString('utf-8');
    });

    socket.on('end', () => {
      const response = responseData.trim();

      if (response.endsWith('OK')) {
        resolve({ isClean: true });
      } else if (response.includes('FOUND')) {
        // Response format: "stream: <virus_name> FOUND"
        const foundMatch = response.match(/stream:\s*(.+?)\s*FOUND/);
        const virusName = foundMatch ? foundMatch[1] : response;
        resolve({ isClean: false, virusName });
      } else {
        resolve({ isClean: false, error: `Unexpected ClamAV response: ${response}` });
      }
    });

    socket.on('error', (err: Error) => {
      resolve({ isClean: false, error: `ClamAV connection error: ${err.message}` });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ isClean: false, error: 'ClamAV connection timed out' });
    });

    socket.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      // Send INSTREAM command
      socket.write('nINSTREAM\n');

      // Send buffer in chunks with 4-byte big-endian length prefix
      let offset = 0;
      while (offset < buffer.length) {
        const chunk = buffer.subarray(offset, offset + MAX_CHUNK_SIZE);
        const lengthPrefix = Buffer.alloc(4);
        lengthPrefix.writeUInt32BE(chunk.length, 0);
        socket.write(lengthPrefix);
        socket.write(chunk);
        offset += MAX_CHUNK_SIZE;
      }

      // Send 0-length chunk to signal end of stream
      const zeroLength = Buffer.alloc(4);
      zeroLength.writeUInt32BE(0, 0);
      socket.write(zeroLength);
    });
  });
}