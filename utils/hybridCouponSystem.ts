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
      // Step 1: Try automatic barcode detection
      console.log('📷 Step 1: Attempting automatic barcode detection...')
      const barcodeResult = await this.detectBarcodeAdvanced(imageUrl)
      
      if (barcodeResult) {
        console.log('✅ Barcode detected successfully:', barcodeResult.value)
        
        // Generate clean barcode for store scanning
        const cleanBarcode = await this.generateCleanBarcode(barcodeResult.value, barcodeResult.format)
        
        result.barcode = {
          ...barcodeResult,
          cleanBarcodeDataUrl: cleanBarcode
        }
        result.success = true
        result.fallbackToOriginal = false
        
        console.log('🎉 Clean barcode generated - ready for store scanning!')
      } else {
        console.log('❌ Automatic barcode detection failed')
        console.log('📱 Will use original image for store scanning')
      }

      // Step 2: Extract text for additional info (always try)
      console.log('📝 Step 2: Extracting text information...')
      const textResult = await this.extractText(imageUrl)
      
      if (textResult) {
        result.text = textResult.text
        result.confidence = textResult.confidence
        
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
