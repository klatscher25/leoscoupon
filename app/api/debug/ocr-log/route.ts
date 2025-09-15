import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, message, data, timestamp } = body
    
    // Log to server console with timestamp
    const logTime = new Date(timestamp || Date.now()).toISOString()
    const logPrefix = `[OCR-DEBUG ${logTime}]`
    
    switch (level) {
      case 'error':
        console.error(`${logPrefix} ❌`, message, data || '')
        break
      case 'warn':
        console.warn(`${logPrefix} ⚠️`, message, data || '')
        break
      case 'info':
        console.info(`${logPrefix} ℹ️`, message, data || '')
        break
      default:
        console.log(`${logPrefix} 📝`, message, data || '')
        break
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[OCR-DEBUG] Failed to log:', error)
    return NextResponse.json({ success: false, error: 'Logging failed' }, { status: 500 })
  }
}
