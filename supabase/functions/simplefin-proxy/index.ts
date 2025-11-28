import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { url, method = 'GET' } = await req.json()

    // Validate URL is from SimpleFin
    if (!url || !url.startsWith('https://')) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Additional security: Only allow SimpleFin domains
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('simplefin')) {
      return new Response(
        JSON.stringify({ error: 'Only SimpleFin URLs are allowed' }), 
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Forward request to SimpleFin
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('SimpleFin proxy error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

