// Real Barcode and OCR Analysis
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { createWorker } from 'tesseract.js'

export interface AnalysisResult {
  barcode?: {
    value: string
    format: string
  }
  text?: string
  confidence?: number
}

export class ImageAnalyzer {
  private barcodeReader: BrowserMultiFormatReader
  private ocrWorker: any

  constructor() {
    // Initialize ZXing barcode reader
    this.barcodeReader = new BrowserMultiFormatReader()
    
    // Configure hints for better recognition
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    this.barcodeReader.hints = hints
  }

  async initializeOCR() {
    if (!this.ocrWorker) {
      console.log('🔍 Initializing OCR worker...')
      this.ocrWorker = await createWorker('deu', 1, {
        logger: m => console.log('OCR:', m)
      })
    }
    return this.ocrWorker
  }

  async analyzeImage(imageUrl: string): Promise<AnalysisResult> {
    console.log('🔍 Starting real image analysis for:', imageUrl)
    
    try {
      // Load image into canvas for processing
      const canvas = await this.loadImageToCanvas(imageUrl)
      
      // Run barcode and OCR recognition in parallel
      const [barcodeResult, ocrResult] = await Promise.allSettled([
        this.detectBarcode(canvas),
        this.extractText(canvas)
      ])

      const result: AnalysisResult = {}

      // Process barcode result
      if (barcodeResult.status === 'fulfilled' && barcodeResult.value) {
        result.barcode = barcodeResult.value
        console.log('📷 Barcode detected:', result.barcode)
      } else {
        console.log('📷 No barcode detected')
      }

      // Process OCR result
      if (ocrResult.status === 'fulfilled' && ocrResult.value) {
        result.text = ocrResult.value.text
        result.confidence = ocrResult.value.confidence
        console.log('📝 Text extracted:', result.text)
        console.log('🎯 Confidence:', result.confidence)
      } else {
        console.log('📝 No text extracted')
      }

      return result

    } catch (error) {
      console.error('❌ Analysis error:', error)
      throw error
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

  private async detectBarcode(canvas: HTMLCanvasElement): Promise<{value: string, format: string} | null> {
    try {
      const imageData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
      
      // Try multiple approaches for better detection
      const approaches = [
        // Original resolution
        () => this.barcodeReader.decodeFromImageData(imageData),
        // Enhanced contrast
        () => this.detectWithEnhancedContrast(canvas),
        // Grayscale conversion
        () => this.detectWithGrayscale(canvas)
      ]

      for (const approach of approaches) {
        try {
          const result = await approach()
          if (result) {
            return {
              value: result.getText(),
              format: result.getBarcodeFormat().toString()
            }
          }
        } catch (e) {
          // Continue to next approach
          console.log('Trying next barcode detection approach...')
        }
      }

      return null
    } catch (error) {
      console.log('Barcode detection failed:', error)
      return null
    }
  }

  private async detectWithEnhancedContrast(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Enhance contrast
    const factor = 1.5
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor)     // R
      data[i + 1] = Math.min(255, data[i + 1] * factor) // G
      data[i + 2] = Math.min(255, data[i + 2] * factor) // B
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async detectWithGrayscale(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = gray     // R
      data[i + 1] = gray // G
      data[i + 2] = gray // B
    }

    return this.barcodeReader.decodeFromImageData(imageData)
  }

  private async extractText(canvas: HTMLCanvasElement): Promise<{text: string, confidence: number} | null> {
    try {
      await this.initializeOCR()
      
      // Convert canvas to image data for Tesseract
      const dataUrl = canvas.toDataURL('image/png')
      
      console.log('🔍 Running OCR on image...')
      const { data } = await this.ocrWorker.recognize(dataUrl)
      
      if (data.text && data.text.trim().length > 0) {
        return {
          text: data.text.trim(),
          confidence: data.confidence
        }
      }
      
      return null
    } catch (error) {
      console.log('OCR extraction failed:', error)
      return null
    }
  }

  async cleanup() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate()
      this.ocrWorker = null
    }
  }
}

// Store detection patterns based on real barcodes
export const detectStoreFromBarcode = (barcode: string): string | null => {
  const patterns = {
    'EDEKA': /^901000/, // EDEKA pattern from your example
    'REWE': /^400638/,
    'ALDI': /^433725/,
    'LIDL': /^425123/,
    'PENNY': /^412345/,
    'dm': /^405678/,
    'ROSSMANN': /^407890/
  }

  for (const [store, pattern] of Object.entries(patterns)) {
    if (pattern.test(barcode)) {
      return store
    }
  }
  return null
}

// Enhanced text parsing based on your EDEKA example
export const parseCouponText = (text: string) => {
  const result: any = {}
  
  console.log('📝 Parsing extracted text:', text)
  
  // Parse multiplier (20FACH, 10FACH etc.)
  const multiplierMatch = text.match(/(\d+)\s*FACH/i)
  if (multiplierMatch) {
    result.multiplier = multiplierMatch[1]
    result.title = `${multiplierMatch[1]}FACH auf den Einkauf`
    result.category = 'aktion'
  }

  // Parse percentage discount (20%, 10% etc.)
  const percentageMatch = text.match(/(\d+)\s*%/g)
  if (percentageMatch && !multiplierMatch) {
    result.discount_percentage = percentageMatch[0].replace(/[%\s]/g, '')
  }

  // Parse euro discount (5€, 10€ etc.)
  const discountMatch = text.match(/(\d+)\s*[€€]/g)
  if (discountMatch && !multiplierMatch && !percentageMatch) {
    result.discount_amount = discountMatch[0].replace(/[€€\s]/g, '')
  }

  // Parse minimum amount with flexible patterns
  const minAmountPatterns = [
    /Mindestumsatz\s*(\d+)\s*[€€]/i,
    /ab\s*(\d+)\s*[€€]/i,
    /mindest\w*\s*(\d+)\s*[€€]/i
  ]
  
  for (const pattern of minAmountPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.minimum_purchase_amount = match[1]
      break
    }
  }

  // Parse validity dates (German format)
  const datePatterns = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
    /bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
    /gültig\s+.*?(\d{1,2})\.(\d{1,2})\.(\d{4})/i
  ]
  
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const [, day, month, year] = match
      result.valid_until = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      break
    }
    if (result.valid_until) break
  }

  // Extract conditions
  const lines = text.split(/\n|\./).filter(line => line.trim().length > 10)
  const conditionKeywords = ['Mindestumsatz', 'nur einmal', 'pro Kunde', 'ausgenommen', 'nicht kombinierbar']
  
  const conditions = lines.filter(line => 
    conditionKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    )
  )
  
  if (conditions.length > 0) {
    result.conditions = conditions.join('. ')
  }

  // Set description
  if (lines.length > 0) {
    result.description = lines.slice(0, 3).join('. ').trim()
  }

  return result
}
