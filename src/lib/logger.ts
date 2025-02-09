type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  module?: string;
  method?: string;
  userId?: string;
  simulationId?: string;
  poolId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
}

class Logger {
  private formatLogEntry(level: LogLevel, message: string, context: LogContext = {}, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code || (error as any).status
      };
    }

    return logEntry;
  }

  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error) {
    const logEntry = this.formatLogEntry(level, message, context, error);
    
    // In development, format logs for better readability
    if (process.env.NODE_ENV === 'development') {
      const contextStr = Object.keys(context).length ? 
        `\nContext: ${JSON.stringify(context, null, 2)}` : '';
      const errorStr = error ? 
        `\nError: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}` : '';
      
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`
      );
    } else {
      // In production, log structured JSON for better parsing
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        JSON.stringify(logEntry)
      );
    }

    return logEntry;
  }

  info(message: string, context: LogContext = {}) {
    return this.log('info', message, context);
  }

  warn(message: string, context: LogContext = {}, error?: Error) {
    return this.log('warn', message, context, error);
  }

  error(message: string, context: LogContext = {}, error?: Error) {
    return this.log('error', message, context, error);
  }

  debug(message: string, context: LogContext = {}) {
    if (process.env.NODE_ENV === 'development') {
      return this.log('debug', message, context);
    }
  }

  // Helper for simulation-specific logging
  simulation(message: string, context: LogContext = {}, error?: Error) {
    return this.log(
      error ? 'error' : 'info',
      message,
      {
        ...context,
        module: 'simulation',
        timestamp: Date.now()
      },
      error
    );
  }

  // Helper for trade-specific logging
  trade(message: string, context: LogContext = {}, error?: Error) {
    return this.log(
      error ? 'error' : 'info',
      message,
      {
        ...context,
        module: 'trading',
        timestamp: Date.now()
      },
      error
    );
  }
}

export const logger = new Logger();
