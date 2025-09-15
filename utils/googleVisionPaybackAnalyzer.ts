// Google Vision API für PAYBACK-Karten Erkennung
import ServerLogger from './serverLogger'

export interface PaybackCardResult {
  success: boolean
  cardNumber?: string
  confidence: number
  costs: {
    apiCalls: number
    estimatedCost: number
  }
  processingTime: number
  debugInfo?: {
    detectedTexts: string[]
    visionApiResponse: any
  }
}

export interface GoogleVisionConfig {
  apiKey: string
  enableDebug?: boolean
}

export class GoogleVisionPaybackAnalyzer {
  private config: GoogleVisionConfig

  constructor(config: GoogleVisionConfig) {
    this.config = config
  }

  /**
   * MAIN ANALYSIS METHOD - PAYBACK Card Recognition
   */
  async analyzePaybackCard(imageUrl: string): Promise<PaybackCardResult> {
    const startTime = Date.now()
    console.log('💳 GOOGLE VISION PAYBACK ANALYSIS starting', {
      imageUrl: imageUrl.substring(0, 100),
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!this.config.apiKey
    })
    ServerLogger.info('💳 GOOGLE VISION PAYBACK ANALYSIS starting', imageUrl.substring(0, 100))

    const result: PaybackCardResult = {
      success: false,
      confidence: 0,
      costs: { apiCalls: 0, estimatedCost: 0 },
      processingTime: 0,
      debugInfo: {
        detectedTexts: [],
        visionApiResponse: null
      }
    }

    try {
      // Check API key
      if (!this.config.apiKey) {
        throw new Error('Google Vision API key not configured')
      }

      console.log('🔄 Converting image to base64...')
      const base64Image = await this.imageToBase64(imageUrl)
      console.log('✅ Image converted to base64')
      
      console.log('🔄 Starting Google Vision API call for PAYBACK card...')
      const paybackResult = await this.performPaybackCardDetection(base64Image)
      
      if (paybackResult) {
        result.cardNumber = paybackResult.cardNumber
        result.confidence = paybackResult.confidence
        result.success = true
        
        if (this.config.enableDebug) {
          result.debugInfo!.detectedTexts = paybackResult.allTexts || []
          result.debugInfo!.visionApiResponse = paybackResult.rawResponse
        }
      }

      // Calculate costs
      result.costs = {
        apiCalls: 1, // Only text detection
        estimatedCost: 1 * 0.0015 // $1.50 per 1000 requests
      }
      
      result.processingTime = Date.now() - startTime
      
      if (result.success) {
        ServerLogger.info('✅ PAYBACK CARD DETECTED', {
          cardNumber: `****${result.cardNumber?.slice(-4)}`,
          confidence: result.confidence,
          costs: result.costs
        })
      } else {
        ServerLogger.warn('❌ NO PAYBACK CARD DETECTED')
      }

      return result

    } catch (error) {
      ServerLogger.error('💥 GOOGLE VISION PAYBACK ERROR', error)
      result.processingTime = Date.now() - startTime
      return result
    }
  }

  /**
   * Google Vision PAYBACK Card Detection - Specialized for PAYBACK numbers
   */
  private async performPaybackCardDetection(base64Image: string): Promise<{
    cardNumber: string, 
    confidence: number, 
    allTexts?: string[], 
    rawResponse?: any
  } | null> {
    console.log('🔄 Calling Google Vision API for PAYBACK card detection...')

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1
            },
            {
              type: 'TEXT_DETECTION',
              maxResults: 30 // Get lots of text to find PAYBACK number
            }
          ]
        }]
      })
    })

    console.log('📡 Google Vision API Response:', {
      status: response.status,
      ok: response.ok
    })

    const data = await response.json()
    console.log('📋 Google Vision API Data received')
    
    if (!response.ok) {
      console.error('❌ Google Vision API Error:', {
        status: response.status,
        error: data.error,
        message: data.error?.message
      })
      throw new Error(`Google Vision API error: ${data.error?.message || 'Unknown error'}`)
    }

    const annotations = data.responses?.[0]
    if (!annotations?.textAnnotations) {
      console.log('❌ No text annotations found')
      return null
    }

    // Extract all detected texts
    const allTexts = annotations.textAnnotations.map((t: any) => t.description)
    console.log('🔍 All detected texts:', allTexts.length, 'items')
    
    // Look for PAYBACK card number patterns
    const paybackNumber = this.extractPaybackNumber(allTexts)
    
    if (paybackNumber) {
      console.log('✅ PAYBACK number found:', `****${paybackNumber.slice(-4)}`)
      return {
        cardNumber: paybackNumber,
        confidence: 95, // High confidence for Google Vision
        allTexts: this.config.enableDebug ? allTexts : undefined,
        rawResponse: this.config.enableDebug ? data : undefined
      }
    }

    console.log('❌ No valid PAYBACK number found in detected texts')
    return null
  }

  /**
   * Extract PAYBACK number from detected texts
   */
  private extractPaybackNumber(texts: string[]): string | null {
    console.log('🔍 Analyzing texts for PAYBACK number patterns...')
    
    for (const text of texts) {
      // Clean the text (remove spaces, special chars, keep only digits)
      const cleanText = text.replace(/[^\d]/g, '')
      
      console.log('🧹 Cleaned text:', cleanText, 'from:', text)
      
      // PAYBACK card numbers are typically 10-16 digits
      if (cleanText.length >= 10 && cleanText.length <= 16) {
        // Additional validation: PAYBACK numbers often start with specific patterns
        if (this.isValidPaybackPattern(cleanText)) {
          console.log('✅ Valid PAYBACK pattern found:', `****${cleanText.slice(-4)}`)
          return cleanText
        }
      }
      
      // Also check for patterns with spaces/formatting
      const spacedPattern = text.match(/\b(\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/)
      if (spacedPattern) {
        const formatted = spacedPattern[1].replace(/\s/g, '')
        if (formatted.length >= 10 && formatted.length <= 16) {
          console.log('✅ Formatted PAYBACK pattern found:', `****${formatted.slice(-4)}`)
          return formatted
        }
      }
    }
    
    console.log('❌ No valid PAYBACK number pattern found')
    return null
  }

  /**
   * Validate PAYBACK number pattern
   */
  private isValidPaybackPattern(number: string): boolean {
    // PAYBACK numbers are usually 10-16 digits
    if (number.length < 10 || number.length > 16) {
      return false
    }
    
    // Must be all digits
    if (!/^\d+$/.test(number)) {
      return false
    }
    
    // Additional PAYBACK-specific validation could be added here
    // For now, we accept any 10-16 digit number
    
    return true
  }

  /**
   * Helper: Convert image to base64
   */
  private async imageToBase64(imageUrl: string): Promise<string> {
    try {
      // If it's already a data URL, extract the base64 part
      if (imageUrl.startsWith('data:')) {
        return imageUrl.split(',')[1]
      }
      
      // Fetch the image and convert to base64
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data:image/jpeg;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      ServerLogger.error('Failed to convert image to base64:', error)
      throw error
    }
  }

  /**
   * Get API costs summary
   */
  getCostSummary() {
    return {
      apiCallCost: 0.0015, // $1.50 per 1000 calls
      description: 'Google Vision Text Detection für PAYBACK-Karten'
    }
  }
}
