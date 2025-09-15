/**
 * Server Logger Utility - sends logs from browser to server for iPhone debugging
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error'

interface LogData {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
}

class ServerLogger {
  private static isClient = typeof window !== 'undefined'
  private static logQueue: LogData[] = []
  private static isProcessing = false

  /**
   * Send log to server console (for iPhone debugging)
   */
  static async logToServer(level: LogLevel, message: string, data?: any) {
    if (!this.isClient) return // Only run in browser
    
    const logData: LogData = {
      level,
      message,
      data: data ? (typeof data === 'object' ? JSON.stringify(data) : String(data)) : undefined,
      timestamp: Date.now()
    }

    // Also log locally for desktop debugging
    switch (level) {
      case 'error':
        console.error(`[TO-SERVER] ❌ ${message}`, data || '')
        break
      case 'warn':
        console.warn(`[TO-SERVER] ⚠️ ${message}`, data || '')
        break
      case 'info':
        console.info(`[TO-SERVER] ℹ️ ${message}`, data || '')
        break
      default:
        console.log(`[TO-SERVER] 📝 ${message}`, data || '')
        break
    }

    // Queue for server logging
    this.logQueue.push(logData)
    
    // Process queue
    if (!this.isProcessing) {
      this.processLogQueue()
    }
  }

  private static async processLogQueue() {
    if (this.logQueue.length === 0) return
    
    this.isProcessing = true
    
    while (this.logQueue.length > 0) {
      const logData = this.logQueue.shift()!
      
      try {
        await fetch('/api/debug/ocr-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logData)
        })
      } catch (error) {
        console.error('[ServerLogger] Failed to send log to server:', error)
        // Don't retry, just continue with next log
      }
    }
    
    this.isProcessing = false
  }

  // Convenience methods
  static log(message: string, data?: any) {
    this.logToServer('log', message, data)
  }

  static info(message: string, data?: any) {
    this.logToServer('info', message, data)
  }

  static warn(message: string, data?: any) {
    this.logToServer('warn', message, data)
  }

  static error(message: string, data?: any) {
    this.logToServer('error', message, data)
  }
}

export default ServerLogger
