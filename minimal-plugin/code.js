// Minimal Figma Plugin - Main Thread (code.js)
console.log('🚀 Minimal plugin main thread started');

// Show the UI
figma.showUI(__html__, { width: 300, height: 200 });

// Send initial frame count when plugin loads
function sendFrameCount() {
  const frames = figma.currentPage.findAll(node => node.type === 'FRAME');
  const frameCount = frames.length;
  
  console.log('📊 Found frames:', frameCount);
  console.log('📤 Sending frame count to UI...');
  
  // Send message to UI
  figma.ui.postMessage({
    type: 'frame-count',
    count: frameCount
  });
  
  console.log('✅ Frame count sent:', frameCount);
}

// Listen for messages from UI
figma.ui.onmessage = (msg) => {
  console.log('📨 Main thread received RAW message:', msg);
  console.log('📨 Message type:', typeof msg);
  console.log('📨 Message keys:', Object.keys(msg || {}));
  console.log('📨 Message.type:', msg && msg.type);
  
  if (msg.type === 'get-frame-count') {
    console.log('🔄 UI requested frame count');
    sendFrameCount();
  } else if (msg.type === 'capture-frames') {
    console.log('📸 UI requested frame capture');
    captureFrames();
  } else if (msg.type === 'analyze-with-claude') {
    console.log('🤖 UI requested Claude analysis');
    analyzeWithClaude(msg.apiKey, msg.frame);
  } else if (msg.type === 'close-plugin') {
    console.log('❌ UI requested plugin close');
    figma.closePlugin();
  } else {
    console.log('⚠️ Unknown message type from UI:', msg && msg.type);
    console.log('⚠️ Full message:', msg);
  }
};

// Capture selected frames with actual images
async function captureFrames() {
  const selection = figma.currentPage.selection;
  console.log('📸 Capturing frames. Selection:', selection.length);
  
  // Filter to only frames
  const frames = selection.filter(node => node.type === 'FRAME');
  console.log('📦 Valid frames found:', frames.length);
  
  if (frames.length === 0) {
    console.log('❌ No frames selected');
    figma.ui.postMessage({
      type: 'capture-result',
      success: false,
      message: 'No frames selected. Please select some frames first.',
      capturedCount: 0
    });
    return;
  }
  
  console.log('🔄 Starting image capture...');
  figma.ui.postMessage({
    type: 'capture-progress',
    message: 'Capturing frame images...'
  });
  
  try {
    const capturedFrames = [];
    
    // Capture all selected frames
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      console.log(`📷 Capturing image for frame ${i + 1}/${frames.length}:`, frame.name);
      
      // Export frame as PNG image
      const imageBytes = await frame.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      });
      
      console.log('✅ Image exported:', imageBytes.length, 'bytes');
      
      // Convert to base64
      const base64 = figma.base64Encode(imageBytes);
      const imageDataUrl = `data:image/png;base64,${base64}`;
      
      console.log('✅ Base64 conversion complete:', imageDataUrl.length, 'characters');
      
      const capturedFrame = {
        id: frame.id,
        name: frame.name,
        width: frame.width,
        height: frame.height,
        image: imageDataUrl
      };
      
      capturedFrames.push(capturedFrame);
      console.log(`✅ Frame ${i + 1}/${frames.length} captured with image`);
      
      // Send progress update
      if (frames.length > 1) {
        figma.ui.postMessage({
          type: 'capture-progress',
          message: `Captured ${i + 1}/${frames.length} frames...`
        });
      }
    }
    
    console.log('✅ All frames captured:', capturedFrames.length);
    
    // Send to UI for Claude analysis
    figma.ui.postMessage({
      type: 'capture-result',
      success: true,
      message: `Successfully captured ${capturedFrames.length} frame${capturedFrames.length > 1 ? 's' : ''} with images!`,
      capturedCount: capturedFrames.length,
      frames: capturedFrames
    });
    
  } catch (error) {
    console.error('❌ Error capturing frame:', error);
    figma.ui.postMessage({
      type: 'capture-result',
      success: false,
      message: `Error capturing frame: ${error.message}`,
      capturedCount: 0
    });
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  const frameCount = selection.filter(node => node.type === 'FRAME').length;
  
  console.log('🔄 Selection changed. Selected frames:', frameCount);
  
  figma.ui.postMessage({
    type: 'selection-changed',
    selectedFrames: frameCount,
    totalSelected: selection.length
  });
});

// Claude API analysis function (main thread has network access)
async function analyzeWithClaude(apiKey, frame) {
  console.log('🤖 Starting Claude analysis for frame:', frame.name);
  
  figma.ui.postMessage({
    type: 'analysis-progress',
    message: 'Analyzing with Claude...'
  });
  
  try {
    
    // Try backend proxy first (deployed Vercel function)
    let response;
    try {
      console.log('🌐 Attempting backend proxy call...');
      response = await fetch('https://sythetic-testing.vercel.app/api/claude-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: 'Please analyze this UI design screenshot. Give me a brief analysis (2-3 sentences) of its usability and visual design.'
            }, {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: frame.image.replace('data:image/png;base64,', '')
              }
            }]
          }]
        })
      });
    } catch (proxyError) {
      console.log('🚫 Proxy failed, trying direct API:', proxyError.message);
      // Fallback to direct API call
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: 'Please analyze this UI design screenshot. Give me a brief analysis (2-3 sentences) of its usability and visual design.'
            }, {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: frame.image.replace('data:image/png;base64,', '')
              }
            }]
          }]
        })
      });
    }
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const analysisText = result.content[0].text;
    
    console.log('✅ Claude analysis complete');
    
    // Send results back to UI
    figma.ui.postMessage({
      type: 'analysis-result',
      success: true,
      analysis: analysisText,
      frameName: frame.name
    });
    
  } catch (error) {
    console.error('❌ Claude analysis error:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      errorMessage = 'CORS blocked - Claude API requires a backend proxy. For now, showing mock analysis.';
      
      // Provide a mock analysis for demonstration
      figma.ui.postMessage({
        type: 'analysis-result',
        success: true,
        analysis: `🤖 Mock Analysis for "${frame.name}":

This UI design shows a well-structured interface with clear visual hierarchy. The layout appears clean and organized with good use of whitespace. 

For a real analysis, you would need a backend service to proxy the Claude API calls due to CORS restrictions in Figma plugins.

Frame details: ${frame.width}×${frame.height}px`,
        frameName: frame.name,
        isMock: true
      });
      return;
    }
    
    figma.ui.postMessage({
      type: 'analysis-result',
      success: false,
      error: errorMessage
    });
  }
}

// Send initial frame count
sendFrameCount();

console.log('✅ Main thread setup complete');