// Debug logger that persists to localStorage
export class DebugLogger {
  private static readonly LOG_KEY = 'auth_debug_logs';
  private static readonly MAX_LOGS = 100;

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data) : undefined
    };

    // Get existing logs
    const existingLogs = this.getLogs();
    
    // Add new log
    existingLogs.push(logEntry);
    
    // Keep only the last MAX_LOGS entries
    const trimmedLogs = existingLogs.slice(-this.MAX_LOGS);
    
    // Save to localStorage
    try {
      localStorage.setItem(this.LOG_KEY, JSON.stringify(trimmedLogs));
      console.log(`[DEBUG] ${message}`, data);
    } catch (error) {
      console.error('Failed to save debug log:', error);
    }
  }

  static getLogs() {
    try {
      const logs = localStorage.getItem(this.LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to retrieve debug logs:', error);
      return [];
    }
  }

  static clearLogs() {
    localStorage.removeItem(this.LOG_KEY);
  }

  static printLogs() {
    const logs = this.getLogs();
    console.log('=== AUTH DEBUG LOGS ===');
    logs.forEach((log: any) => {
      console.log(`${log.timestamp}: ${log.message}`, log.data ? JSON.parse(log.data) : '');
    });
    console.log('=== END DEBUG LOGS ===');
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authDebug = DebugLogger;
}