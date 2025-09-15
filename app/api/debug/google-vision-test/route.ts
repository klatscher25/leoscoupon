import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, apiKey } = await request.json()

    console.log('🧪 GOOGLE VISION DEBUG TEST', {
      timestamp: new Date().toISOString(),
      imageUrl: imageUrl?.substring(0, 100),
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin')
    })

    if (!apiKey) {
      console.error('❌ No API key provided')
      return NextResponse.json({ 
        error: 'API key required',
        debug: 'No Google Vision API key provided in request'
      }, { status: 400 })
    }

    if (!imageUrl) {
      console.error('❌ No image URL provided')
      return NextResponse.json({ 
        error: 'Image URL required',
        debug: 'No image URL provided in request'
      }, { status: 400 })
    }

    // Test Google Vision API connectivity
    console.log('🔄 Testing Google Vision API connectivity...')
    
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    })

    console.log('📡 API Response Status:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    const data = await response.json()
    console.log('📋 API Response Data:', data)

    if (!response.ok) {
      console.error('❌ Google Vision API test failed:', data.error)
      return NextResponse.json({ 
        error: 'Google Vision API test failed',
        details: data.error,
        debug: {
          status: response.status,
          statusText: response.statusText,
          apiResponse: data
        }
      }, { status: 500 })
    }

    console.log('✅ Google Vision API test successful')
    
    return NextResponse.json({ 
      success: true,
      message: 'Google Vision API is working correctly',
      debug: {
        apiKeyValid: true,
        apiConnectivity: true,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('💥 Google Vision test error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Google Vision Debug Endpoint',
    instructions: 'Send POST request with { imageUrl, apiKey } to test Google Vision API'
  })
}
