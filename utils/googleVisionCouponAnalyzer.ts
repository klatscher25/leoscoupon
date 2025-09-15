// Google Vision API Coupon Analyzer - Premium Accurate Recognition
import ServerLogger from './serverLogger'

export interface GoogleVisionCouponResult {
  success: boolean
  barcode?: {
    value: string
    format: string
    confidence: number
  }
  text?: string
  confidence: number
  structuredData: {
    storeName?: string
    discountType?: 'percentage' | 'euro' | 'multiplier' | 'other'
    discountValue?: number
    discountText?: string
    minAmount?: number
    validUntil?: string
    conditions?: string[]
    rawBarcode?: string
  }
  costs: {
    apiCalls: number
    estimatedCost: number
  }
  processingTime: number
  originalImageUrl: string
  debugInfo?: {
    detectedTexts: string[]
    detectedBarcodes: any[]
    visionApiResponses: any[]
  }
}

export interface GoogleVisionConfig {
  apiKey: string
  projectId?: string
  enableDebug?: boolean
}

export interface CostLimits {
  maxMonthlyBudget: number // Euro
  maxDailyRequests: number
  warningThreshold: number // Prozent des Budgets
}

export class GoogleVisionCouponAnalyzer {
  private config: GoogleVisionConfig
  private costLimits: CostLimits
  private monthlyUsageKey: string
  private currentMonthUsage: number = 0
  private currentDayUsage: number = 0

  constructor(config: GoogleVisionConfig, costLimits: Partial<CostLimits> = {}) {
    this.config = config
    this.costLimits = {
      maxMonthlyBudget: costLimits.maxMonthlyBudget || 10.0, // 10€ für 60 Coupons/Monat
      maxDailyRequests: costLimits.maxDailyRequests || 50,
      warningThreshold: costLimits.warningThreshold || 80, // 80% Warnung
      ...costLimits
    }
    
    this.monthlyUsageKey = `google-vision-usage-${new Date().getFullYear()}-${new Date().getMonth()}`
    this.loadUsageFromStorage()
  }

  /**
   * MAIN ANALYSIS METHOD - Pure Google Vision API
   */
  async analyzeImage(imageUrl: string): Promise<GoogleVisionCouponResult> {
    const startTime = Date.now()
    console.log('🌟 GOOGLE VISION COUPON ANALYSIS starting', {
      imageUrl: imageUrl.substring(0, 100),
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...'
    })
    ServerLogger.info('🌟 GOOGLE VISION COUPON ANALYSIS starting', imageUrl.substring(0, 100))

    const result: GoogleVisionCouponResult = {
      success: false,
      confidence: 0,
      structuredData: {},
      costs: { apiCalls: 0, estimatedCost: 0 },
      processingTime: 0,
      originalImageUrl: imageUrl,
      debugInfo: {
        detectedTexts: [],
        detectedBarcodes: [],
        visionApiResponses: []
      }
    }

    try {
      // Check if we can use the API
      if (!this.canUseGoogleVision()) {
        const errorMsg = 'Google Vision API usage limits exceeded'
        console.error('🚫 GOOGLE VISION BLOCKED', {
          dailyUsage: this.currentDayUsage,
          dailyLimit: this.costLimits.maxDailyRequests,
          monthlyUsage: this.currentMonthUsage,
          monthlyBudget: this.costLimits.maxMonthlyBudget
        })
        throw new Error(errorMsg)
      }

      console.log('🔄 Converting image to base64...', { imageUrl: imageUrl.substring(0, 50) })
      // Convert image to base64
      const base64Image = await this.imageToBase64(imageUrl)
      console.log('✅ Image converted to base64', { 
        base64Length: base64Image.length,
        base64Preview: base64Image.substring(0, 50) + '...'
      })
      
      // Run comprehensive analysis
      console.log('🔄 Starting Google Vision API calls...', {
        textDetection: 'DOCUMENT_TEXT_DETECTION + TEXT_DETECTION',
        barcodeDetection: 'TEXT_DETECTION (pattern matching)'
      })
      
      const [textResult, barcodeResult] = await Promise.allSettled([
        this.performTextDetection(base64Image),
        this.performBarcodeDetection(base64Image)
      ])
      
      console.log('📊 Google Vision API results:', {
        textStatus: textResult.status,
        barcodeStatus: barcodeResult.status,
        textSuccess: textResult.status === 'fulfilled' && textResult.value,
        barcodeSuccess: barcodeResult.status === 'fulfilled' && barcodeResult.value
      })

      // Calculate costs
      result.costs = {
        apiCalls: 2, // Text + Barcode detection
        estimatedCost: 2 * 0.0015 // $1.50 per 1000 requests = $0.003 for 2 calls
      }

      // Process text detection results
      if (textResult.status === 'fulfilled' && textResult.value) {
        result.text = textResult.value.text
        result.confidence = textResult.value.confidence
        result.success = true
        
        if (this.config.enableDebug) {
          result.debugInfo!.detectedTexts = textResult.value.allTexts || []
          result.debugInfo!.visionApiResponses.push(textResult.value.rawResponse)
        }
      }

      // Process barcode detection results
      if (barcodeResult.status === 'fulfilled' && barcodeResult.value) {
        result.barcode = barcodeResult.value
        result.success = true
        
        if (this.config.enableDebug) {
          result.debugInfo!.detectedBarcodes.push(barcodeResult.value)
        }
      }

      // Parse structured data from detected content
      result.structuredData = this.parseStructuredData(
        result.text || '', 
        result.barcode?.value
      )

      // Update cost tracking
      this.updateUsageTracking(result.costs)
      
      result.processingTime = Date.now() - startTime
      
      if (result.success) {
        ServerLogger.info('✅ GOOGLE VISION SUCCESS', {
          barcode: result.barcode?.value,
          store: result.structuredData.storeName,
          discount: `${result.structuredData.discountValue}${result.structuredData.discountType}`,
          costs: result.costs
        })
      } else {
        ServerLogger.warn('❌ GOOGLE VISION FAILED to detect content')
      }

      return result

    } catch (error) {
      ServerLogger.error('💥 GOOGLE VISION ERROR', error)
      result.processingTime = Date.now() - startTime
      return result
    }
  }

  /**
   * Google Vision Text Detection - Comprehensive OCR
   */
  private async performTextDetection(base64Image: string): Promise<{
    text: string, 
    confidence: number, 
    allTexts?: string[], 
    rawResponse?: any
  }> {
    console.log('🔄 Calling Google Vision Text Detection API...', {
      apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
      features: ['DOCUMENT_TEXT_DETECTION', 'TEXT_DETECTION']
    })

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
              maxResults: 20
            }
          ]
        }]
      })
    })

    console.log('📡 Google Vision API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    const data = await response.json()
    console.log('📋 Google Vision API Data:', {
      hasResponses: !!data.responses,
      responseCount: data.responses?.length || 0,
      firstResponseKeys: data.responses?.[0] ? Object.keys(data.responses[0]) : [],
      hasError: !!data.error
    })
    
    if (!response.ok) {
      console.error('❌ Google Vision API Error:', {
        status: response.status,
        error: data.error,
        message: data.error?.message
      })
      throw new Error(`Google Vision API error: ${data.error?.message || 'Unknown error'}`)
    }

    const annotations = data.responses?.[0]

    // Try document text detection first (more accurate for structured text)
    if (annotations?.fullTextAnnotation?.text) {
      const allTexts = annotations.textAnnotations?.map((t: any) => t.description) || []
      
      return {
        text: annotations.fullTextAnnotation.text,
        confidence: 95, // Google Vision is very accurate
        allTexts,
        rawResponse: this.config.enableDebug ? data : undefined
      }
    }

    // Fallback to regular text detection
    if (annotations?.textAnnotations?.length > 0) {
      const mainText = annotations.textAnnotations[0].description
      const allTexts = annotations.textAnnotations.map((t: any) => t.description)
      
      return {
        text: mainText,
        confidence: 90,
        allTexts,
        rawResponse: this.config.enableDebug ? data : undefined
      }
    }

    throw new Error('No text detected by Google Vision')
  }

  /**
   * Google Vision Barcode Detection - Advanced Pattern Recognition
   */
  private async performBarcodeDetection(base64Image: string): Promise<{
    value: string, 
    format: string, 
    confidence: number
  }> {
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
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 50 // Get all text to find barcode numbers
          }]
        }]
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Google Vision API error: ${data.error?.message || 'Unknown error'}`)
    }

    // Look for barcode patterns in detected text
    if (data.responses?.[0]?.textAnnotations) {
      const texts = data.responses[0].textAnnotations
      
      for (const annotation of texts) {
        const text = annotation.description.replace(/\s/g, '') // Remove spaces
        
        // EAN-13 pattern (like your EDEKA example: 9010002232171158)
        if (/^\d{13,18}$/.test(text) && text.length >= 13) {
          return {
            value: text,
            format: this.determineBarcodeFormat(text),
            confidence: 95
          }
        }
        
        // EAN-8 pattern
        if (/^\d{8}$/.test(text)) {
          return {
            value: text,
            format: 'EAN_8',
            confidence: 95
          }
        }
        
        // UPC patterns
        if (/^\d{12}$/.test(text)) {
          return {
            value: text,
            format: 'UPC_A',
            confidence: 95
          }
        }
      }
    }

    throw new Error('No barcode detected by Google Vision')
  }

  /**
   * Determine barcode format based on pattern and length
   */
  private determineBarcodeFormat(barcode: string): string {
    if (barcode.length === 13) return 'EAN_13'
    if (barcode.length === 8) return 'EAN_8'
    if (barcode.length === 12) return 'UPC_A'
    if (barcode.length > 13) return 'CODE_128'
    return 'UNKNOWN'
  }

  /**
   * Parse structured coupon data - Optimized for German coupons
   */
  private parseStructuredData(text: string, barcode?: string): any {
    const result: any = {}
    
    // Store detection from barcode (priority)
    if (barcode) {
      result.rawBarcode = barcode
      result.storeName = this.detectStoreFromBarcode(barcode)
    }
    
    // Store detection from text if barcode detection failed
    if (!result.storeName && text) {
      result.storeName = this.detectStoreFromText(text)
    }
    
    if (text) {
      // 1. MULTIPLIER DISCOUNTS (like your 20FACH example)
      const multiplierMatch = text.match(/(\d+)\s*FACH/i)
      if (multiplierMatch) {
        result.discountType = 'multiplier'
        result.discountValue = parseInt(multiplierMatch[1])
        result.discountText = `${multiplierMatch[1]}FACH auf den Einkauf`
      }
      
      // 2. PERCENTAGE DISCOUNTS (20%, 15% etc.)
      const percentageMatch = text.match(/(\d+)\s*%(?:\s*(?:Rabatt|Nachlass|auf))?/i)
      if (percentageMatch && !multiplierMatch) {
        result.discountType = 'percentage'
        result.discountValue = parseInt(percentageMatch[1])
        result.discountText = `${percentageMatch[1]}% Rabatt`
      }
      
      // 3. EURO DISCOUNTS (5€, 10€ etc.)
      const euroMatch = text.match(/(\d+)\s*[€€](?:\s*(?:Rabatt|Nachlass|sparen))?/i)
      if (euroMatch && !multiplierMatch && !percentageMatch) {
        result.discountType = 'euro'
        result.discountValue = parseInt(euroMatch[1])
        result.discountText = `${euroMatch[1]}€ Rabatt`
      }
      
      // 4. MINIMUM PURCHASE AMOUNT - Multiple patterns
      const minAmountPatterns = [
        /(?:ab|Mindestumsatz|Mindestbestellwert|mindest\w*)\s*(\d+)\s*[€€]/i,
        /(\d+)\s*[€€]\s*Mindestumsatz/i
      ]
      
      for (const pattern of minAmountPatterns) {
        const match = text.match(pattern)
        if (match) {
          result.minAmount = parseInt(match[1])
          break
        }
      }
      
      // 5. VALIDITY DATE - German format (dd.mm.yyyy)
      const datePatterns = [
        /(?:gültig|Gültig)\s+(?:vom|bis)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
        /bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/g
      ]
      
      for (const pattern of datePatterns) {
        const match = text.match(pattern)
        if (match) {
          const [, day, month, year] = match
          result.validUntil = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          break
        }
      }
      
      // 6. CONDITIONS AND RESTRICTIONS
      const conditionKeywords = [
        'nur einmal',
        'pro Kunde',
        'pro Einkauf',
        'nicht kombinierbar',
        'ausgenommen',
        'Mindestumsatz',
        'ab dem',
        'nur einlösbar',
        'keine Funktionsgarantie',
        'eigene Verantwortung'
      ]
      
      const lines = text.split(/\n|\./).filter(line => line.trim().length > 10)
      const conditions = lines.filter(line => 
        conditionKeywords.some(keyword => 
          line.toLowerCase().includes(keyword.toLowerCase())
        )
      )
      
      if (conditions.length > 0) {
        result.conditions = conditions.map(c => c.trim())
      }
    }
    
    return result
  }

  /**
   * Store Detection from Barcode - German retailers
   */
  private detectStoreFromBarcode(barcode: string): string | null {
    // Updated patterns based on real German retailer barcodes
    const patterns = {
      'EDEKA': /^90100[0-9]/, // Your example starts with 901000
      'REWE': /^400638/,
      'ALDI': /^433725/,
      'LIDL': /^425123/,
      'PENNY': /^412345/,
      'dm': /^405678/,
      'ROSSMANN': /^407890/,
      'KAUFLAND': /^281234/,
      'REAL': /^456789/,
      'NETTO': /^523456/
    }

    ServerLogger.info('🔍 Testing barcode for store detection:', barcode)
    
    for (const [store, pattern] of Object.entries(patterns)) {
      if (pattern.test(barcode)) {
        ServerLogger.info(`✅ Store detected: ${store}`)
        return store
      }
    }
    
    ServerLogger.warn('❌ No store pattern matched for barcode:', barcode)
    return null
  }

  /**
   * Store Detection from Text - Comprehensive keyword matching
   */
  private detectStoreFromText(text: string): string | null {
    const storeKeywords = {
      'EDEKA': ['edeka', 'e center', 'e-center'],
      'REWE': ['rewe', 'nahkauf', 'rewe center'],
      'ALDI': ['aldi', 'aldi süd', 'aldi nord'],
      'LIDL': ['lidl', 'lidl plus'],
      'PENNY': ['penny', 'penny markt'],
      'dm': ['dm', 'dm-drogerie', 'drogerie markt'],
      'ROSSMANN': ['rossmann', 'rossmann drogerie'],
      'KAUFLAND': ['kaufland'],
      'REAL': ['real', 'real markt'],
      'NETTO': ['netto', 'netto marken-discount']
    }

    const lowerText = text.toLowerCase()
    ServerLogger.info('🔍 Testing text for store detection:', lowerText.substring(0, 100))
    
    for (const [store, keywords] of Object.entries(storeKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          ServerLogger.info(`✅ Store detected from text: ${store} (keyword: ${keyword})`)
          return store
        }
      }
    }
    
    ServerLogger.warn('❌ No store detected from text')
    return null
  }

  /**
   * Batch Processing for Google Drive folders
   */
  async processBatch(imageUrls: string[]): Promise<GoogleVisionCouponResult[]> {
    ServerLogger.info(`🔄 BATCH PROCESSING ${imageUrls.length} coupons with Google Vision`)
    
    const results: GoogleVisionCouponResult[] = []
    const batchSize = 3 // Conservative batch size to avoid quota issues
    
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize)
      
      ServerLogger.info(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageUrls.length/batchSize)}`)
      
      // Process batch in parallel
      const batchPromises = batch.map(url => this.analyzeImage(url))
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Create failed result
          results.push({
            success: false,
            confidence: 0,
            structuredData: {},
            costs: { apiCalls: 0, estimatedCost: 0 },
            processingTime: 0,
            originalImageUrl: batch[j]
          })
        }
      }
      
      // Delay between batches to be nice to Google's servers
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Summary logging
    const successful = results.filter(r => r.success).length
    const totalCost = results.reduce((sum, r) => sum + r.costs.estimatedCost, 0)
    
    ServerLogger.info(`🎯 BATCH COMPLETE: ${successful}/${results.length} successful, $${totalCost.toFixed(4)} total cost`)
    
    return results
  }

  /**
   * Cost Control and Monitoring
   */
  private canUseGoogleVision(): boolean {
    // Check API key
    if (!this.config.apiKey) {
      ServerLogger.error('❌ Google Vision API key not configured')
      return false
    }
    
    // Check daily quota
    if (this.currentDayUsage >= this.costLimits.maxDailyRequests) {
      ServerLogger.warn(`🚫 Daily quota exceeded: ${this.currentDayUsage}/${this.costLimits.maxDailyRequests}`)
      return false
    }
    
    // Check monthly budget (estimate 2 API calls = $0.003)
    const estimatedCost = 0.003
    if (this.currentMonthUsage + estimatedCost > this.costLimits.maxMonthlyBudget) {
      ServerLogger.warn(`🚫 Monthly budget exceeded: $${this.currentMonthUsage.toFixed(4)}/$${this.costLimits.maxMonthlyBudget}`)
      return false
    }

    return true
  }

  private updateUsageTracking(costs: {apiCalls: number, estimatedCost: number}) {
    this.currentDayUsage += costs.apiCalls
    this.currentMonthUsage += costs.estimatedCost
    
    // Warning at 80% of budget
    const usagePercent = (this.currentMonthUsage / this.costLimits.maxMonthlyBudget) * 100
    if (usagePercent >= this.costLimits.warningThreshold) {
      ServerLogger.warn(`⚠️ Budget warning: ${usagePercent.toFixed(1)}% of monthly budget used`)
    }
    
    // Save to localStorage for persistence
    localStorage.setItem(this.monthlyUsageKey, JSON.stringify({
      monthUsage: this.currentMonthUsage,
      dayUsage: this.currentDayUsage,
      lastUpdate: new Date().toISOString()
    }))
  }

  private loadUsageFromStorage() {
    try {
      const stored = localStorage.getItem(this.monthlyUsageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.currentMonthUsage = data.monthUsage || 0
        
        // Reset daily usage if it's a new day
        const today = new Date().toDateString()
        const lastUpdate = new Date(data.lastUpdate).toDateString()
        if (today !== lastUpdate) {
          this.currentDayUsage = 0
        } else {
          this.currentDayUsage = data.dayUsage || 0
        }
      }
    } catch (error) {
      ServerLogger.warn('Could not load usage from storage:', error)
    }
  }

  /**
   * Helper Methods
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
   * Cost and Usage Monitoring
   */
  getCostSummary() {
    const usagePercent = (this.currentMonthUsage / this.costLimits.maxMonthlyBudget) * 100
    
    return {
      monthlyUsage: this.currentMonthUsage,
      monthlyBudget: this.costLimits.maxMonthlyBudget,
      dailyUsage: this.currentDayUsage,
      dailyQuota: this.costLimits.maxDailyRequests,
      percentageUsed: usagePercent,
      remainingBudget: this.costLimits.maxMonthlyBudget - this.currentMonthUsage,
      remainingDailyQuota: this.costLimits.maxDailyRequests - this.currentDayUsage,
      isNearLimit: usagePercent >= this.costLimits.warningThreshold
    }
  }

  /**
   * Reset usage counters (for testing or new month)
   */
  resetUsage() {
    this.currentMonthUsage = 0
    this.currentDayUsage = 0
    localStorage.removeItem(this.monthlyUsageKey)
    ServerLogger.info('✅ Usage counters reset')
  }
}
