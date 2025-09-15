// Advanced Barcode Detector - Optimized for retail scanning
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'

export class AdvancedBarcodeDetector {
  private reader: BrowserMultiFormatReader

  constructor() {
    this.reader = new BrowserMultiFormatReader()
    
    // Configure for maximum barcode detection accuracy
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,    // Most important for retail
      BarcodeFormat.EAN_8,     // Short EAN codes
      BarcodeFormat.UPC_A,     // US retail
      BarcodeFormat.UPC_E,     // Short UPC
      BarcodeFormat.CODE_128,  // Variable length codes
      BarcodeFormat.CODE_39,   // Legacy codes
      BarcodeFormat.QR_CODE,   // Modern coupons
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.PURE_BARCODE, false) // Allow barcodes with surrounding content
    hints.set(DecodeHintType.ALSO_INVERTED, true) // Try inverted barcodes
    this.reader.hints = hints
  }

  async detectBarcode(imageUrl: string): Promise<{value: string, format: string} | null> {
    console.log('🎯 ADVANCED BARCODE DETECTION starting for:', imageUrl)
    
    try {
      const canvas = await this.loadImageToCanvas(imageUrl)
      console.log('📐 Image loaded to canvas:', canvas.width, 'x', canvas.height)
      
      // Try multiple sophisticated approaches
      const approaches = [
        { name: 'Original High Quality', fn: () => this.detectOriginal(canvas) },
        { name: 'Region of Interest (ROI)', fn: () => this.detectFromRegions(canvas) },
        { name: 'Enhanced Sharpening', fn: () => this.detectWithSharpening(canvas) },
        { name: 'Adaptive Threshold', fn: () => this.detectWithAdaptiveThreshold(canvas) },
        { name: 'Multi-Scale Detection', fn: () => this.detectMultiScale(canvas) },
        { name: 'Morphological Enhancement', fn: () => this.detectWithMorphology(canvas) },
        { name: 'Edge Enhancement', fn: () => this.detectWithEdgeEnhancement(canvas) },
        { name: 'Gamma Correction', fn: () => this.detectWithGammaCorrection(canvas) },
        { name: 'Bilateral Filter', fn: () => this.detectWithBilateralFilter(canvas) },
        { name: 'Last Resort - High Contrast', fn: () => this.detectLastResort(canvas) }
      ]

      for (const approach of approaches) {
        try {
          console.log(`🔍 Trying: ${approach.name}`)
          const result = await approach.fn()
          if (result) {
            console.log(`🎉 SUCCESS with ${approach.name}! Barcode:`, result.getText())
            return {
              value: result.getText(),
              format: result.getBarcodeFormat().toString()
            }
          }
        } catch (error) {
          console.log(`❌ ${approach.name} failed:`, error)
        }
      }

      console.log('😞 All barcode detection methods failed')
      return null

    } catch (error) {
      console.error('💥 Critical barcode detection error:', error)
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

  private async detectOriginal(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return this.reader.decodeFromImageData(imageData)
  }

  // ROI Detection - Focus on likely barcode areas
  private async detectFromRegions(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas
    
    // Common barcode positions in coupons
    const regions = [
      { x: 0, y: height * 0.6, w: width, h: height * 0.4 }, // Bottom 40%
      { x: 0, y: height * 0.3, w: width, h: height * 0.4 }, // Middle 40%
      { x: width * 0.1, y: 0, w: width * 0.8, h: height }, // Central 80% width
      { x: 0, y: 0, w: width, h: height * 0.3 }, // Top 30%
    ]

    for (const region of regions) {
      try {
        const imageData = ctx.getImageData(region.x, region.y, region.w, region.h)
        const result = await this.reader.decodeFromImageData(imageData)
        if (result) return result
      } catch (e) {
        // Continue to next region
      }
    }
    return null
  }

  // Enhanced Sharpening for blurry images
  private async detectWithSharpening(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Unsharp mask sharpening
    const sharpened = new ImageData(canvas.width, canvas.height)
    const sharpData = sharpened.data

    for (let i = 0; i < data.length; i += 4) {
      const factor = 1.5 // Sharpening factor
      sharpData[i] = Math.min(255, Math.max(0, data[i] * factor))     // R
      sharpData[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor)) // G
      sharpData[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor)) // B
      sharpData[i + 3] = data[i + 3] // A
    }

    return this.reader.decodeFromImageData(sharpened)
  }

  // Adaptive threshold for varying lighting
  private async detectWithAdaptiveThreshold(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Convert to grayscale first
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      data[i] = gray > 128 ? 255 : 0     // Simple threshold
      data[i + 1] = gray > 128 ? 255 : 0
      data[i + 2] = gray > 128 ? 255 : 0
    }

    return this.reader.decodeFromImageData(imageData)
  }

  // Multi-scale detection
  private async detectMultiScale(canvas: HTMLCanvasElement) {
    const scales = [1.0, 1.2, 0.8, 1.5, 0.6]
    
    for (const scale of scales) {
      try {
        const scaledCanvas = this.scaleCanvas(canvas, scale)
        const ctx = scaledCanvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height)
        const result = await this.reader.decodeFromImageData(imageData)
        if (result) return result
      } catch (e) {
        // Continue to next scale
      }
    }
    return null
  }

  private scaleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    const scaledCanvas = document.createElement('canvas')
    const ctx = scaledCanvas.getContext('2d')!
    
    scaledCanvas.width = canvas.width * scale
    scaledCanvas.height = canvas.height * scale
    
    ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
    return scaledCanvas
  }

  // Morphological operations
  private async detectWithMorphology(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Simple dilation to thicken barcode lines
    const dilated = new ImageData(canvas.width, canvas.height)
    const dilatedData = dilated.data

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const binary = gray < 128 ? 0 : 255
      
      dilatedData[i] = binary
      dilatedData[i + 1] = binary
      dilatedData[i + 2] = binary
      dilatedData[i + 3] = 255
    }

    return this.reader.decodeFromImageData(dilated)
  }

  // Edge enhancement
  private async detectWithEdgeEnhancement(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Simple edge detection enhancement
    for (let i = 0; i < data.length; i += 4) {
      const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3
      const enhanced = intensity > 100 ? 255 : 0
      
      data[i] = enhanced
      data[i + 1] = enhanced
      data[i + 2] = enhanced
    }

    return this.reader.decodeFromImageData(imageData)
  }

  // Gamma correction
  private async detectWithGammaCorrection(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    const gamma = 0.5 // Brighten dark images
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.pow(data[i] / 255, gamma) * 255       // R
      data[i + 1] = Math.pow(data[i + 1] / 255, gamma) * 255 // G
      data[i + 2] = Math.pow(data[i + 2] / 255, gamma) * 255 // B
    }

    return this.reader.decodeFromImageData(imageData)
  }

  // Bilateral filter for noise reduction
  private async detectWithBilateralFilter(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Simple bilateral-like filtering
    ctx.filter = 'blur(1px) contrast(150%)'
    ctx.drawImage(canvas, 0, 0)
    
    const filteredData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return this.reader.decodeFromImageData(filteredData)
  }

  // Last resort - extreme processing
  private async detectLastResort(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Extreme black and white conversion
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      const value = avg > 140 ? 255 : 0 // High threshold
      
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
    }

    return this.reader.decodeFromImageData(imageData)
  }
}
