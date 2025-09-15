// Hybrid Coupon System: Auto-Detection + Original Image Fallback
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { createWorker } from 'tesseract.js'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

export interface CouponDetectionResult {
  success: boolean
  barcode?: {
    value: string
    format: string
    cleanBarcodeDataUrl?: string  // Generated clean barcode
  }
  originalImageUrl: string        // Always available for store scanning
  text?: string
  confidence?: number
  fallbackToOriginal: boolean     // True if we should show original image
  storeInfo?: {
    detectedStore: string
    confidence: number
  }
  structuredData?: {
    detectedStoreName?: string      // "EDEKA", "REWE" etc. from image
    couponValueType?: 'multiplier' | 'euro_amount' | 'percentage' | 'buy_x_get_y' | 'other'
    couponValueNumeric?: number     // 20 for "20FACH", 5 for "5€"
    couponValueText?: string        // "20FACH auf den Einkauf"
  }
}

export class HybridCouponSystem {
  private barcodeReader: BrowserMultiFormatReader
  private ocrWorker: any

  constructor() {
    this.barcodeReader = new BrowserMultiFormatReader()
    
    // Configure for maximum detection success
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,    // Most important for retail
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.ALSO_INVERTED, true)
    this.barcodeReader.hints = hints
  }

  async processCoupon(imageUrl: string): Promise<CouponDetectionResult> {
    console.log('🎯 HYBRID COUPON PROCESSING starting for:', imageUrl)
    
    const result: CouponDetectionResult = {
      success: false,
      originalImageUrl: imageUrl,
      fallbackToOriginal: true
    }

    try {
      // Step 1: Try automatic barcode detection (lines)
      console.log('📷 Step 1: Attempting barcode line detection...')
      const barcodeResult = await this.detectBarcodeAdvanced(imageUrl)
      
      // Step 1.5: If line detection fails, try number recognition under barcode
      let finalBarcodeResult = barcodeResult
      if (!barcodeResult) {
        console.log('🔢 Step 1.5: Trying barcode number recognition (much easier!)...')
        const numberResult = await this.detectBarcodeNumber(imageUrl)
        if (numberResult) {
          finalBarcodeResult = numberResult
          console.log('🎉 Barcode number detected from text:', numberResult.value)
        }
      }
      
      if (finalBarcodeResult) {
        console.log('✅ Barcode detected successfully:', finalBarcodeResult.value)
        
        // Generate clean barcode for store scanning
        const cleanBarcode = await this.generateCleanBarcode(finalBarcodeResult.value, finalBarcodeResult.format)
        
        result.barcode = {
          ...finalBarcodeResult,
          cleanBarcodeDataUrl: cleanBarcode
        }
        result.success = true
        result.fallbackToOriginal = false
        
        console.log('🎉 Clean barcode generated - ready for store scanning!')
      } else {
        console.log('❌ Both barcode line and number detection failed')
        console.log('📱 Will use original image for store scanning')
      }

      // Step 2: Extract text for additional info (always try)
      console.log('📝 Step 2: Extracting text information...')
      const textResult = await this.extractText(imageUrl)
      
      if (textResult) {
        result.text = textResult.text
        result.confidence = textResult.confidence
        
        // Extract structured data from text
        const structuredData = this.extractStructuredData(textResult.text)
        if (structuredData) {
          result.structuredData = structuredData
        }
        
        // Try to detect store from text as fallback  
        const storeInfo = this.detectStoreFromText(textResult.text)
        if (storeInfo) {
          result.storeInfo = storeInfo
        }
      }

      // Step 3: Final decision
      if (result.barcode) {
        console.log('🎯 SUCCESS: Will show clean generated barcode')
        result.fallbackToOriginal = false
      } else {
        console.log('📱 FALLBACK: Will show original image for manual scanning')
        result.fallbackToOriginal = true
        result.success = true  // Still success - we have the original image
      }

      return result

    } catch (error) {
      console.error('💥 Hybrid coupon processing error:', error)
      // Even on error, we can still show the original image
      return {
        success: true,
        originalImageUrl: imageUrl,
        fallbackToOriginal: true
      }
    }
  }

  private async detectBarcodeAdvanced(imageUrl: string): Promise<{value: string, format: string} | null> {
    try {
      const canvas = await this.loadImageToCanvas(imageUrl)
      console.log('📐 Canvas loaded:', canvas.width, 'x', canvas.height)
      
      // Multiple detection strategies with different preprocessing
      const strategies = [
        { name: 'Original', fn: () => this.detectFromOriginal(canvas) },
        { name: 'High Contrast', fn: () => this.detectWithHighContrast(canvas) },
        { name: 'Grayscale', fn: () => this.detectWithGrayscale(canvas) },
        { name: 'Sharpened', fn: () => this.detectWithSharpening(canvas) },
        { name: 'Inverted', fn: () => this.detectWithInversion(canvas) },
        { name: 'Regions', fn: () => this.detectFromRegions(canvas) }
      ]

      for (const strategy of strategies) {
        try {
          console.log(`🔍 Trying: ${strategy.name}`)
          const result = await strategy.fn()
          if (result) {
            console.log(`✅ SUCCESS with ${strategy.name}!`)
            return {
              value: result.getText(),
              format: result.getBarcodeFormat().toString()
            }
          }
        } catch (e) {
          console.log(`❌ ${strategy.name} failed`)
        }
      }

      return null
    } catch (error) {
      console.log('❌ Barcode detection error:', error)
      return null
    }
  }

  private async detectBarcodeNumber(imageUrl: string): Promise<{value: string, format: string} | null> {
    try {
      console.log('🔢 Starting intelligent barcode number detection...')
      
      // Extract text first
      const textResult = await this.extractText(imageUrl)
      if (!textResult || !textResult.text) {
        console.log('❌ No text found for number detection')
        return null
      }

      const text = textResult.text
      console.log('📝 Analyzing text for barcode numbers:', text.substring(0, 200))

      // Patterns for different barcode number formats
      const barcodePatterns = [
        // EAN-13 (13 digits) - like your EDEKA example: 9010002232171158
        {
          pattern: /\b\d{13}\b/g,
          format: 'EAN_13',
          description: 'EAN-13 (13 digits)'
        },
        // EAN-8 (8 digits)
        {
          pattern: /\b\d{8}\b/g,
          format: 'EAN_8', 
          description: 'EAN-8 (8 digits)'
        },
        // UPC-A (12 digits)
        {
          pattern: /\b\d{12}\b/g,
          format: 'UPC_A',
          description: 'UPC-A (12 digits)'
        },
        // Code128 - variable length, often 10-14 digits
        {
          pattern: /\b\d{10,14}\b/g,
          format: 'CODE_128',
          description: 'Code128 (10-14 digits)'
        },
        // Separated numbers (with spaces/dashes) - often under barcodes
        {
          pattern: /\b\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}\b/g,
          format: 'SEPARATED_DIGITS',
          description: 'Separated digits'
        }
      ]

      for (const barcodePattern of barcodePatterns) {
        console.log(`🔍 Checking pattern: ${barcodePattern.description}`)
        
        const matches = text.match(barcodePattern.pattern)
        if (matches && matches.length > 0) {
          for (const match of matches) {
            // Clean the number (remove spaces/dashes)
            const cleanNumber = match.replace(/[\s\-]/g, '')
            
            // Validate the number
            if (this.validateBarcodeNumber(cleanNumber)) {
              console.log(`✅ Valid barcode number found: ${cleanNumber} (${barcodePattern.description})`)
              
              // Determine best format based on length
              const finalFormat = this.determineBarcodeFormat(cleanNumber)
              
              return {
                value: cleanNumber,
                format: finalFormat
              }
            }
          }
        }
      }

      console.log('❌ No valid barcode numbers found in text')
      return null

    } catch (error) {
      console.log('❌ Barcode number detection error:', error)
      return null
    }
  }

  private validateBarcodeNumber(number: string): boolean {
    // Basic validation rules
    if (number.length < 8 || number.length > 14) {
      return false
    }

    // Must be all digits
    if (!/^\d+$/.test(number)) {
      return false
    }

    // Avoid common false positives
    const falsePositives = [
      /^0+$/, // All zeros
      /^1+$/, // All ones
      /^(.)\1{7,}$/, // Repeating single digit
      /^(19|20)\d{2}$/, // Years (1900-2099)
      /^\d{1,3}$/, // Too short (1-3 digits)
    ]

    for (const falsePattern of falsePositives) {
      if (falsePattern.test(number)) {
        console.log(`❌ Rejected false positive: ${number}`)
        return false
      }
    }

    // EAN-13 checksum validation for 13-digit numbers
    if (number.length === 13) {
      return this.validateEAN13Checksum(number)
    }

    console.log(`✅ Number ${number} passed basic validation`)
    return true
  }

  private validateEAN13Checksum(ean13: string): boolean {
    if (ean13.length !== 13) return false

    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(ean13[i])
      sum += (i % 2 === 0) ? digit : digit * 3
    }

    const checkDigit = (10 - (sum % 10)) % 10
    const isValid = checkDigit === parseInt(ean13[12])
    
    if (isValid) {
      console.log(`✅ EAN-13 checksum valid: ${ean13}`)
    } else {
      console.log(`❌ EAN-13 checksum invalid: ${ean13} (expected ${checkDigit}, got ${ean13[12]})`)
    }
    
    return isValid
  }

  private determineBarcodeFormat(number: string): string {
    switch (number.length) {
      case 13:
        return 'EAN_13'
      case 12:
        return 'UPC_A'
      case 8:
        return 'EAN_8'
      default:
        return 'CODE_128'
    }
  }

  private async loadImageToCanvas(imageUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        resolve(canvas)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
  }

  private async detectFromOriginal(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectWithHighContrast(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Extreme contrast
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      const value = avg > 128 ? 255 : 0
      
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectWithGrayscale(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectWithSharpening(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Simple sharpening
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.3)
      data[i + 1] = Math.min(255, data[i + 1] * 1.3)
      data[i + 2] = Math.min(255, data[i + 2] * 1.3)
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectWithInversion(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Invert colors
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectFromRegions(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas
    
    // Focus on common barcode areas
    const regions = [
      { x: 0, y: height * 0.7, w: width, h: height * 0.3 }, // Bottom 30%
      { x: 0, y: height * 0.4, w: width, h: height * 0.3 }, // Middle 30%
      { x: width * 0.1, y: 0, w: width * 0.8, h: height }, // Central 80%
    ]

    for (const region of regions) {
      try {
        const imageData = ctx.getImageData(region.x, region.y, region.w, region.h)
        const result = await this.barcodeReader.decodeFromImageData(imageData)
        if (result) return result
      } catch (e) {
        continue
      }
    }
    return null
  }

  private async generateCleanBarcode(value: string, format: string): Promise<string> {
    try {
      console.log('🎨 Generating clean barcode for:', value, 'format:', format)
      
      // Create canvas for barcode generation
      const canvas = document.createElement('canvas')
      
      if (format.toLowerCase().includes('qr')) {
        // Generate QR Code
        const qrDataUrl = await QRCode.toDataURL(value, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        return qrDataUrl
      } else {
        // Generate traditional barcode
        JsBarcode(canvas, value, {
          format: this.mapToJsBarcodeFormat(format),
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: '#FFFFFF',
          lineColor: '#000000'
        })
        
        return canvas.toDataURL('image/png')
      }
    } catch (error) {
      console.error('❌ Clean barcode generation failed:', error)
      throw error
    }
  }

  private mapToJsBarcodeFormat(zxingFormat: string): string {
    const formatMap: {[key: string]: string} = {
      'EAN_13': 'EAN13',
      'EAN_8': 'EAN8', 
      'UPC_A': 'UPC',
      'UPC_E': 'UPC',
      'CODE_128': 'CODE128',
      'CODE_39': 'CODE39'
    }
    
    return formatMap[zxingFormat] || 'CODE128'
  }

  private async extractText(imageUrl: string): Promise<{text: string, confidence: number} | null> {
    try {
      if (!this.ocrWorker) {
        console.log('🔍 Initializing OCR worker...')
        this.ocrWorker = await createWorker('deu', 1, {
          logger: m => console.log('OCR:', m.status, m.progress)
        })
      }
      
      console.log('📝 Running OCR on image...')
      const { data } = await this.ocrWorker.recognize(imageUrl)
      
      if (data.text && data.text.trim().length > 0) {
        return {
          text: data.text.trim(),
          confidence: data.confidence
        }
      }
      
      return null
    } catch (error) {
      console.log('❌ OCR extraction failed:', error)
      return null
    }
  }

  private extractStructuredData(text: string): any {
    console.log('🔍 Extracting structured coupon data from text...')
    
    const result: any = {}
    
    // 1. Detect Store Name (case-insensitive, position-aware)
    const storeNames = ['EDEKA', 'REWE', 'ALDI', 'LIDL', 'PENNY', 'dm', 'ROSSMANN', 'NETTO', 'KAUFLAND']
    const upperText = text.toUpperCase()
    
    for (const store of storeNames) {
      if (upperText.includes(store)) {
        result.detectedStoreName = store
        console.log(`🏪 Store detected: ${store}`)
        break
      }
    }
    
    // 2. Extract Coupon Value and Type
    const couponValue = this.extractCouponValue(text)
    if (couponValue) {
      result.couponValueType = couponValue.type
      result.couponValueNumeric = couponValue.numeric
      result.couponValueText = couponValue.text
      console.log(`💰 Coupon value: ${couponValue.text} (${couponValue.type}, ${couponValue.numeric})`)
    }
    
    return Object.keys(result).length > 0 ? result : null
  }

  private extractCouponValue(text: string): {type: string, numeric: number, text: string} | null {
    console.log('💰 Analyzing coupon value patterns...')
    
    // Pattern 1: Multiplier (20FACH, 10FACH, etc.)
    const multiplierMatch = text.match(/(\d+)\s*FACH/i)
    if (multiplierMatch) {
      const numeric = parseInt(multiplierMatch[1])
      const fullText = text.match(/\d+\s*FACH[^.]*(?:\.|$)/i)?.[0] || `${numeric}FACH`
      return {
        type: 'multiplier',
        numeric: numeric,
        text: fullText.trim()
      }
    }
    
    // Pattern 2: Euro Amount (5€, 10€, 3€ Rabatt, etc.)
    const euroMatches = text.match(/(\d+)\s*[€€](?:\s*Rabatt)?/gi)
    if (euroMatches && euroMatches.length > 0) {
      // Take the first euro amount found
      const match = euroMatches[0]
      const numericMatch = match.match(/(\d+)/)
      if (numericMatch) {
        const numeric = parseInt(numericMatch[1])
        // Try to get more context
        const contextMatch = text.match(/(\d+\s*[€€][^.]*(?:\.|$))/i)
        const fullText = contextMatch ? contextMatch[1].trim() : match
        
        return {
          type: 'euro_amount',
          numeric: numeric,
          text: fullText
        }
      }
    }
    
    // Pattern 3: Percentage (20%, 10% auf, etc.)
    const percentageMatch = text.match(/(\d+)\s*%(?:\s*(?:auf|Rabatt))?[^.]*(?:\.|$)/i)
    if (percentageMatch) {
      const numeric = parseInt(percentageMatch[1])
      return {
        type: 'percentage',
        numeric: numeric,
        text: percentageMatch[0].trim()
      }
    }
    
    // Pattern 4: Buy X Get Y (2 für 1, 3 für 2, etc.)
    const buyGetMatch = text.match(/(\d+)\s*für\s*(\d+)/i)
    if (buyGetMatch) {
      const buy = parseInt(buyGetMatch[1])
      const get = parseInt(buyGetMatch[2])
      // Calculate savings percentage: (buy-get)/buy * 100
      const savingsPercent = Math.round(((buy - get) / buy) * 100)
      
      return {
        type: 'buy_x_get_y',
        numeric: savingsPercent, // Use savings percentage for sorting
        text: buyGetMatch[0]
      }
    }
    
    console.log('❌ No coupon value pattern found')
    return null
  }

  private detectStoreFromText(text: string): {detectedStore: string, confidence: number} | null {
    const storeKeywords = {
      'EDEKA': ['edeka', 'e center'],
      'REWE': ['rewe', 'nahkauf'],
      'ALDI': ['aldi', 'aldi süd', 'aldi nord'],
      'LIDL': ['lidl', 'lidl plus'],
      'PENNY': ['penny'],
      'dm': ['dm', 'dm-drogerie', 'drogerie markt'],
      'ROSSMANN': ['rossmann']
    }

    const lowerText = text.toLowerCase()
    
    for (const [store, keywords] of Object.entries(storeKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          // Simple confidence based on keyword length and position
          const confidence = keyword.length > 3 ? 0.9 : 0.7
          return { detectedStore: store, confidence }
        }
      }
    }
    
    return null
  }

  async cleanup() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate()
      this.ocrWorker = null
    }
  }
}
