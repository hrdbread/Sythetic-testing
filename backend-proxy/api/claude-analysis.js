// Vercel Serverless Function for Claude API Proxy
// This bypasses CORS restrictions for Figma plugins

export default async function handler(req, res) {
  // Set CORS headers to allow Figma plugin access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🤖 Proxy: Received Claude analysis request');
    console.log('📋 Proxy: Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Proxy: Request headers:', req.headers);
    
    // Extract API key from request
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    if (!apiKey) {
      console.log('❌ Proxy: No API key found in headers or body');
      return res.status(400).json({ error: 'API key required' });
    }
    
    console.log('🔑 Proxy: API key provided:', apiKey.substring(0, 20) + '...');
    
    // Prepare Claude API request - strip out apiKey from body
    const claudeRequestBody = { ...req.body };
    delete claudeRequestBody.apiKey; // Remove apiKey from request body
    
    console.log('🚀 Proxy: Sending to Claude API:', JSON.stringify(claudeRequestBody, null, 2));
    
    // Make request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequestBody)
    });
    
    console.log('📡 Proxy: Claude API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy: Claude API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status}`,
        details: errorText
      });
    }
    
    const result = await response.json();
    console.log('✅ Proxy: Successfully proxied Claude response');
    
    // Return the Claude response
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Proxy: Server error:', error);
    return res.status(500).json({ 
      error: 'Proxy server error',
      details: error.message 
    });
  }
}