'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { DebugLogger } from '@/lib/debug-logger';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'debug-panel' });

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, isLoading, role } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const currentState = {
    isAuthenticated,
    isLoading,
    role,
    userId: user?.id,
    userName: user?.name,
  };

  const clearLogs = () => {
    DebugLogger.clearLogs();
    alert('Debug logs cleared');
  };

  const showLogs = () => {
    const logs = DebugLogger.getLogs();
    log.info('=== PERSISTENT AUTH DEBUG LOGS ===');
    logs.forEach((entry: any) => {
      log.info(
        { timestamp: entry.timestamp, data: entry.data ? JSON.parse(entry.data) : undefined },
        entry.message
      );
    });
    log.info('=== END PERSISTENT DEBUG LOGS ===');
    alert('Check console for logs');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        background: 'black',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'red',
          color: 'white',
          border: 'none',
          padding: '5px',
          cursor: 'pointer',
        }}
      >
        {isOpen ? 'Hide' : 'Debug'}
      </button>

      {isOpen && (
        <div style={{ marginTop: '10px', width: '300px' }}>
          <h4>Auth State:</h4>
          <pre>{JSON.stringify(currentState, null, 2)}</pre>

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={showLogs}
              style={{
                background: 'blue',
                color: 'white',
                border: 'none',
                padding: '5px',
                margin: '5px',
                cursor: 'pointer',
              }}
            >
              Show Logs
            </button>
            <button
              onClick={clearLogs}
              style={{
                background: 'orange',
                color: 'white',
                border: 'none',
                padding: '5px',
                margin: '5px',
                cursor: 'pointer',
              }}
            >
              Clear Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
