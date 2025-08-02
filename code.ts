// Figma Plugin Code for Synthetic User Testing

// Plugin data keys
const PLUGIN_DATA_KEYS = {
  FRAME_STATE: 'synthetic-testing-state',
  TEST_RESULTS: 'synthetic-testing-results',
  TEST_HISTORY: 'synthetic-testing-history',
  PLUGIN_VERSION: 'synthetic-testing-version'
};

// Frame workflow states
type FrameState = 'ready' | 'testing' | 'tested' | 'fixed';

// Test result interfaces
interface TestResult {
  id: string;
  timestamp: Date;
  overallScore: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    interaction: number;
  };
  issues: {
    severity: 'critical' | 'moderate' | 'minor';
    category: string;
    description: string;
    suggestion: string;
  }[];
  personas: string[];
}

interface FrameTestData {
  frameId: string;
  frameName: string;
  state: FrameState;
  lastTested?: Date;
  currentResult?: TestResult;
  history: TestResult[];
}

// Show the UI
figma.showUI(__html__, { width: 320, height: 500 });

// Enhanced debugging utility for figma.ui.postMessage calls
function debugPostMessage(message: any, context: string = 'unknown') {
  console.log(`🚀 === DEBUGGING FIGMA.UI.POSTMESSAGE (${context}) ===`);
  
  // 1. Check if figma.ui exists and is available
  console.log('🔍 Figma UI API Status:', {
    figmaExists: typeof figma !== 'undefined',
    figmaUIExists: typeof figma?.ui !== 'undefined',
    postMessageExists: typeof figma?.ui?.postMessage !== 'undefined',
    postMessageType: typeof figma?.ui?.postMessage
  });
  
  if (!figma || !figma.ui || !figma.ui.postMessage) {
    console.error('💥 CRITICAL ERROR: figma.ui.postMessage is not available!');
    console.error('figma:', figma);
    console.error('figma.ui:', figma?.ui);
    console.error('figma.ui.postMessage:', figma?.ui?.postMessage);
    return false;
  }
  
  // 2. Log exact parameters being passed
  console.log('📤 Parameters being passed to figma.ui.postMessage():');
  console.log('  Parameter count:', arguments.length);
  console.log('  Parameter 1 (message):', message);
  console.log('  Parameter 1 type:', typeof message);
  console.log('  Parameter 1 JSON:', JSON.stringify(message, null, 2));
  
  // 3. Validate message structure
  console.log('📋 Message Structure Validation:');
  console.log('  Has type property:', 'type' in message);
  console.log('  Type value:', message.type);
  console.log('  Has data property:', 'data' in message);
  console.log('  Has message property:', 'message' in message);
  console.log('  All properties:', Object.keys(message));
  
  // 4. Check message size (large messages might fail)
  const messageJSON = JSON.stringify(message);
  console.log('📏 Message Size Analysis:');
  console.log('  JSON string length:', messageJSON.length);
  console.log('  Size in bytes (approx):', new Blob([messageJSON]).size);
  console.log('  Size in KB (approx):', Math.round(new Blob([messageJSON]).size / 1024));
  
  // 5. Attempt the actual postMessage call with full error handling
  console.log('🎯 Attempting figma.ui.postMessage() call...');
  try {
    const startTime = performance.now();
    
    // Make the actual call
    figma.ui.postMessage(message);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('✅ SUCCESS: figma.ui.postMessage() completed successfully');
    console.log('  Call duration:', `${duration.toFixed(2)}ms`);
    console.log('  Context:', context);
    console.log('  Message type:', message.type);
    console.log('  Timestamp:', new Date().toISOString());
    
    return true;
    
  } catch (error) {
    console.error('💥 ERROR: figma.ui.postMessage() failed!');
    console.error('  Error type:', error?.constructor?.name);
    console.error('  Error message:', error?.message);
    console.error('  Error stack:', error?.stack);
    console.error('  Context:', context);
    console.error('  Failed message:', message);
    console.error('  Raw error object:', error);
    
    return false;
  }
}

// Initialize plugin on load
initializePlugin();

// Listen for selection changes to provide real-time feedback
figma.on('selectionchange', () => {
  handleSelectionChange();
});

// Handle selection changes
function handleSelectionChange() {
  const selection = figma.currentPage.selection;
  
  console.log('=== SELECTION CHANGED ===');
  console.log('New selection count:', selection.length);
  
  if (selection.length === 0) {
    const emptySelectionMessage = {
      type: 'selection-update',
      data: {
        count: 0,
        validFrames: 0,
        message: 'No items selected. Select frames or components to capture.',
        frameNames: []
      }
    };
    
    debugPostMessage(emptySelectionMessage, 'empty-selection-update');
    return;
  }
  
  // Filter to valid frame types
  const validFrames = selection.filter(node => 
    node.type === 'FRAME' || 
    node.type === 'COMPONENT' || 
    node.type === 'INSTANCE'
  );
  
  const invalidNodes = selection.filter(node => 
    node.type !== 'FRAME' && 
    node.type !== 'COMPONENT' && 
    node.type !== 'INSTANCE'
  );
  
  let message = '';
  if (validFrames.length === 0) {
    const types = [...new Set(selection.map(n => n.type))].join(', ');
    message = `Selected items (${types}) are not frames or components. Please select frames, components, or instances.`;
  } else if (invalidNodes.length > 0) {
    message = `${validFrames.length} valid frame${validFrames.length === 1 ? '' : 's'} selected. ${invalidNodes.length} other item${invalidNodes.length === 1 ? '' : 's'} will be ignored.`;
  } else {
    message = `${validFrames.length} frame${validFrames.length === 1 ? '' : 's'} selected and ready to capture.`;
  }
  
  console.log('Selection feedback:', message);
  
  const selectionData = {
    count: selection.length,
    validFrames: validFrames.length,
    message: message,
    frameNames: validFrames.map(f => f.name)
  };
  
  const messageToSend = {
    type: 'selection-update',
    data: selectionData
  };
  
  debugPostMessage(messageToSend, 'selection-update');
}

// Message handler for UI communication
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'capture-frames':
        await captureSelectedFrames();
        break;
      case 'save-test-results':
        await saveTestResults(msg.data);
        break;
      case 'update-frame-state':
        await updateFrameState(msg.data.frameId, msg.data.state);
        break;
      case 'get-frame-states':
        await sendFrameStates();
        break;
      case 'get-test-history':
        await sendTestHistory(msg.data.frameId);
        break;
      case 'clear-frame-data':
        await clearFrameData(msg.data.frameId);
        break;
      case 'get-selection-state':
        handleSelectionChange(); // Send current selection state
        break;
      case 'ui-ready':
        console.log('✅ UI is ready, sending initial selection state');
        handleSelectionChange(); // Send current selection state when UI is ready
        break;
      case 'cancel':
        figma.closePlugin();
        break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    const errorMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    debugPostMessage(errorMessage, 'message-handler-error');
  }
};

// Function to capture selected frames as PNG images
async function captureSelectedFrames() {
  try {
    const selection = figma.currentPage.selection;
    
    // Debug logging for selection
    console.log('=== SELECTION DEBUG ===');
    console.log('Total selected items:', selection.length);
    console.log('Selected items:', selection.map(node => ({
      name: node.name,
      type: node.type,
      id: node.id
    })));
    
    if (selection.length === 0) {
      console.log('ERROR: No items selected');
      const errorMessage = {
        type: 'error',
        message: 'Please select frames or components in Figma first.\n\nHow to select:\n1. Click on frames in your design\n2. Hold Shift to select multiple frames\n3. Components and instances are also supported'
      };
      debugPostMessage(errorMessage, 'capture-no-selection-error');
      return;
    }

    // Filter to only valid frame types
    const validNodes = selection.filter(node => 
      node.type === 'FRAME' || 
      node.type === 'COMPONENT' || 
      node.type === 'INSTANCE'
    );
    
    console.log('Valid frame-like nodes:', validNodes.length);
    console.log('Valid nodes:', validNodes.map(node => ({
      name: node.name,
      type: node.type
    })));

    if (validNodes.length === 0) {
      const selectedTypes = [...new Set(selection.map(node => node.type))].join(', ');
      console.log('ERROR: No valid frames found. Selected types:', selectedTypes);
      const errorMessage = {
        type: 'error',
        message: `Selected items are not frames or components.\n\nSelected: ${selectedTypes}\n\nPlease select:\n• Frames\n• Components\n• Component instances\n\nTip: Look for rectangular containers in your design.`
      };
      debugPostMessage(errorMessage, 'capture-invalid-selection-error');
      return;
    }

    const frameData = [];
    let processedCount = 0;
    let errorCount = 0;

    for (const node of validNodes) {
      try {
        console.log(`Processing node: ${node.name} (${node.type})`);
        
        let frameNode: FrameNode | ComponentNode | InstanceNode;
        
        // Handle different node types
        if (node.type === 'FRAME') {
          frameNode = node;
        } else if (node.type === 'COMPONENT') {
          frameNode = node;
        } else if (node.type === 'INSTANCE') {
          frameNode = node;
        } else {
          console.log(`Skipping unsupported node type`);
          continue;
        }
        
        // Initialize frame state if not set
        await initializeFrameState(frameNode);
        
        // Update state to 'testing' when capturing
        await updateFrameState(frameNode.id, 'testing');
        
        console.log(`Capturing image for: ${frameNode.name}`);
        
        // Capture frame as JPEG
        const imageData = await captureFrameAsJPEG(frameNode);
        
        console.log(`Image captured successfully for: ${frameNode.name} (${imageData.length} chars)`);
        
        // Extract metadata
        const metadata = extractFrameMetadata(frameNode);
        console.log(`Metadata extracted for ${frameNode.name}:`, metadata);
        
        // Get current state and test data
        const testData = await getFrameTestData(frameNode.id);
        
        frameData.push({
          id: frameNode.id,
          name: frameNode.name,
          image: imageData,
          metadata: metadata,
          dimensions: {
            width: frameNode.width,
            height: frameNode.height
          },
          state: testData && testData.state || 'testing',
          lastTested: testData && testData.lastTested,
          hasHistory: testData && testData.history && testData.history.length > 0
        });
        
        processedCount++;
        console.log(`Successfully processed: ${frameNode.name}`);
        
      } catch (nodeError) {
        errorCount++;
        console.error(`Error processing node ${node.name}:`, nodeError);
        // Continue with other nodes
      }
    }

    console.log(`Processing complete: ${processedCount} successful, ${errorCount} errors`);

    // Ensure frameData exists and has content
    if (!frameData || frameData.length === 0) {
      console.log('❌ No frame data captured, sending error message to UI');
      
      const errorMessage = {
        type: 'error',
        message: `Failed to capture any frames.\n\nProcessed: ${processedCount} items\nErrors: ${errorCount} items\n\nTry selecting simpler frames or check the console for details.`
      };
      debugPostMessage(errorMessage, 'capture-no-framedata-error');
      return;
    }
    
    console.log('✅ frameData validation passed:', {
      exists: !!frameData,
      length: frameData.length,
      isArray: Array.isArray(frameData)
    });

    // Send captured data back to UI
    const framesCapturedMessage = {
      type: 'frames-captured',
      data: frameData
    };
    
    debugPostMessage(framesCapturedMessage, 'frames-captured');

    // Success message
    const successMessage = {
      type: 'success',
      message: `Successfully captured ${frameData ? frameData.length : 0} frame${(frameData && frameData.length === 1) ? '' : 's'}!`
    };
    
    debugPostMessage(successMessage, 'capture-success');

  } catch (error) {
    console.error('Error capturing frames:', error);
    const errorMessage = {
      type: 'error',
      message: `Failed to capture frames: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the console for more details.`
    };
    debugPostMessage(errorMessage, 'capture-exception-error');
  }
}

// Function to validate image size and split if needed
function validateImageSize(dataUrl: string, maxLength: number = 400000): { isValid: boolean; chunks?: string[]; warning?: string } {
  if (dataUrl.length <= maxLength) {
    return { isValid: true };
  }
  
  // If image is too large, provide chunking option (for future implementation)
  // Note: This is a placeholder for potential chunking implementation
  // Currently we just warn about large images
  return { 
    isValid: false, 
    warning: `Image too large: ${dataUrl.length} characters (max: ${maxLength}). Consider reducing frame size or complexity.`
  };
}

// Function to attempt reducing image quality further if size is still too large
async function captureWithReducedQuality(frame: FrameNode | ComponentNode | InstanceNode, quality: number = 0.5): Promise<string> {
  try {
    console.log(`Attempting reduced quality export (${Math.round(quality * 100)}%) for: ${frame.name}`);
    
    const imageBytes = await frame.exportAsync({
      format: 'JPG',
      constraint: { type: 'SCALE', value: 1 }
    });

    const base64 = figma.base64Encode(imageBytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    console.log(`Reduced quality export complete: ${dataUrl.length} characters`);
    return dataUrl;
    
  } catch (error) {
    console.error('Reduced quality export failed:', error);
    throw error;
  }
}

// Function to capture a single frame as JPEG and convert to base64
async function captureFrameAsJPEG(frame: FrameNode | ComponentNode | InstanceNode): Promise<string> {
  try {
    console.log(`Exporting ${frame.type}: ${frame.name} (${frame.width}x${frame.height})`);
    
    // Calculate estimated size before export to prevent large base64 strings
    const estimatedPixels = frame.width * frame.height;
    const estimatedSizeKB = estimatedPixels * 3 / 1024; // Rough estimate for JPEG
    
    console.log(`Estimated image size: ${Math.round(estimatedSizeKB)} KB`);
    
    // Warn if image might be too large (>2MB estimated)
    if (estimatedSizeKB > 2048) {
      console.warn(`Large image detected (${Math.round(estimatedSizeKB)} KB estimated). Consider reducing frame size.`);
    }
    
    // Export frame as JPEG with quality setting to reduce file size
    const imageBytes = await frame.exportAsync({
      format: 'JPG',
      constraint: { type: 'SCALE', value: 1 }
    });

    console.log(`Image export complete: ${imageBytes.length} bytes (${Math.round(imageBytes.length / 1024)} KB)`);

    // Additional size check after export
    if (imageBytes.length > 3 * 1024 * 1024) { // 3MB limit
      throw new Error(`Image too large: ${Math.round(imageBytes.length / 1024 / 1024)} MB. Please reduce frame size or complexity.`);
    }

    // Convert to base64
    const base64 = figma.base64Encode(imageBytes);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    console.log(`Base64 conversion complete: ${dataUrl.length} characters`);
    
    // Validate image size to prevent Unicode issues
    const validation = validateImageSize(dataUrl, 400000); // 400K characters ~ 300KB base64
    if (!validation.isValid) {
      console.warn(validation.warning);
      
      // Try to capture with even lower quality as fallback
      try {
        console.log('Attempting capture with reduced quality...');
        const reducedQualityImage = await captureWithReducedQuality(frame, 0.4); // 40% quality
        
        const revalidation = validateImageSize(reducedQualityImage, 400000);
        if (revalidation.isValid) {
          console.log('Reduced quality image meets size requirements');
          return reducedQualityImage;
        } else {
          console.warn('Even reduced quality image is too large, using original');
        }
      } catch (fallbackError) {
        console.warn('Fallback capture failed, using original image:', fallbackError);
      }
    }
    
    return dataUrl;

  } catch (error) {
    console.error('Error capturing frame as JPEG:', error);
    throw new Error(`Failed to capture ${frame.type.toLowerCase()} "${frame.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to extract metadata from frames
function extractFrameMetadata(frame: FrameNode | ComponentNode | InstanceNode) {
  const metadata = {
    hasText: false,
    hasButtons: false,
    hasImages: false,
    textCount: 0,
    buttonCount: 0,
    imageCount: 0,
    components: [] as string[]
  };

  try {
    // Recursively analyze all children
    function analyzeNode(node: SceneNode) {
      switch (node.type) {
        case 'TEXT':
          metadata.hasText = true;
          metadata.textCount++;
          metadata.components.push('text');
          break;
        
        case 'RECTANGLE':
        case 'ELLIPSE':
        case 'POLYGON':
          // Check if it might be a button (has fills and is interactive)
          const hasClick = 'reactions' in node && node.reactions && node.reactions.length > 0;
          if (hasClick) {
            metadata.hasButtons = true;
            metadata.buttonCount++;
            metadata.components.push('button');
          }
          break;
        
        // Note: IMAGE type doesn't exist in current Figma API
        // Images are typically RECTANGLE nodes with image fills
        default:
          // Check for image fills on any node
          if ('fills' in node && Array.isArray(node.fills)) {
            const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
            if (hasImageFill) {
              metadata.hasImages = true;
              metadata.imageCount++;
              metadata.components.push('image');
            }
          }
          break;
        
        case 'COMPONENT':
        case 'INSTANCE':
          // Check component name for common button patterns
          const name = node.name.toLowerCase();
          if (name.includes('button') || name.includes('btn')) {
            metadata.hasButtons = true;
            metadata.buttonCount++;
            metadata.components.push('button');
          }
          break;
      }

      // Recursively check children if they exist
      if ('children' in node && node.children) {
        node.children.forEach(analyzeNode);
      }
    }

    // Start analysis from frame children
    frame.children.forEach(analyzeNode);

  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Return partial metadata even if analysis fails
  }

  return metadata;
}

// Test function to verify message sending (for debugging)
function testMessageSending() {
  console.log('🧪 TESTING MESSAGE SENDING FROM MAIN THREAD');
  
  const testMessage = {
    type: 'test',
    message: 'Test message from main thread'
  };
  
  debugPostMessage(testMessage, 'test-message-sending');
}

// Plugin initialization
async function initializePlugin() {
  console.log('Synthetic User Testing plugin loaded');
  
  // Check and migrate plugin data if needed
  await migratePluginData();
  
  // Update status indicators for all frames on current page
  await updateAllFrameIndicators();
  
  // Test message sending after a short delay to ensure UI is ready
  setTimeout(() => {
    console.log('🔍 Testing message sending capability...');
    testMessageSending();
  }, 2000);
}

// Initialize frame state if not already set
async function initializeFrameState(frame: FrameNode | ComponentNode | InstanceNode) {
  const existingState = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE);
  if (!existingState) {
    await updateFrameState(frame.id, 'ready');
  }
}

// Update frame state and visual indicators
async function updateFrameState(frameId: string, state: FrameState) {
  try {
    const frame = figma.getNodeById(frameId) as FrameNode;
    if (!frame || frame.type !== 'FRAME') {
      throw new Error('Frame not found');
    }

    // Store state in plugin data
    frame.setPluginData(PLUGIN_DATA_KEYS.FRAME_STATE, state);
    
    // Update visual indicator
    await updateFrameIndicator(frame, state);
    
    // Notify UI of state change
    const stateUpdateMessage = {
      type: 'frame-state-updated',
      data: { frameId, state }
    };
    debugPostMessage(stateUpdateMessage, 'frame-state-updated');
    
    console.log(`Frame ${frame.name} state updated to: ${state}`);
    
  } catch (error) {
    console.error('Error updating frame state:', error);
    throw error;
  }
}

// Update visual status indicator on frame
async function updateFrameIndicator(frame: FrameNode, state: FrameState) {
  try {
    // Remove existing indicator
    const existingIndicator = frame.children.find(child => 
      child.name === 'Synthetic Testing Status'
    );
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new status indicator
    const indicator = figma.createEllipse();
    indicator.name = 'Synthetic Testing Status';
    indicator.resize(12, 12);
    
    // Position in top-right corner
    indicator.x = frame.width - 20;
    indicator.y = 8;
    
    // Set color based on state
    const colors = {
      'ready': { r: 0.8, g: 0.8, b: 0.8 }, // Gray
      'testing': { r: 1, g: 0.8, b: 0.2 }, // Yellow
      'tested': { r: 0.2, g: 0.8, b: 0.3 }, // Green
      'fixed': { r: 0.2, g: 0.6, b: 1 } // Blue
    };
    
    indicator.fills = [{
      type: 'SOLID',
      color: colors[state]
    }];
    
    // Add stroke for visibility
    indicator.strokes = [{
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1 }
    }];
    indicator.strokeWeight = 1;
    
    // Add to frame
    frame.appendChild(indicator);
    
  } catch (error) {
    console.error('Error updating frame indicator:', error);
    // Don't throw - indicator is optional
  }
}

// Save test results to plugin data
async function saveTestResults(data: any) {
  try {
    const { frameId, results } = data;
    const frame = figma.getNodeById(frameId) as FrameNode;
    
    if (!frame || frame.type !== 'FRAME') {
      throw new Error('Frame not found');
    }

    // Create test result object
    const testResult: TestResult = {
      id: generateId(),
      timestamp: new Date(),
      overallScore: results.overallScore,
      categoryScores: results.categoryScores,
      issues: results.issues || [],
      personas: results.personas || []
    };

    // Get existing test data
    let testData = await getFrameTestData(frameId);
    if (!testData) {
      testData = {
        frameId,
        frameName: frame.name,
        state: 'tested',
        history: []
      };
    }

    // Update test data
    testData.lastTested = testResult.timestamp;
    testData.currentResult = testResult;
    testData.history.unshift(testResult); // Add to beginning
    testData.history = testData.history.slice(0, 10); // Keep last 10 results
    testData.state = 'tested';

    // Save to plugin data
    frame.setPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS, JSON.stringify(testData));
    
    // Update state and indicator
    await updateFrameState(frameId, 'tested');
    
    const saveResultsMessage = {
      type: 'test-results-saved',
      data: { frameId, success: true }
    };
    debugPostMessage(saveResultsMessage, 'test-results-saved');
    
  } catch (error) {
    console.error('Error saving test results:', error);
    const errorMessage = {
      type: 'error',
      message: `Failed to save test results: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    debugPostMessage(errorMessage, 'save-test-results-error');
  }
}

// Get frame test data
async function getFrameTestData(frameId: string): Promise<FrameTestData | null> {
  try {
    const frame = figma.getNodeById(frameId) as FrameNode;
    if (!frame || frame.type !== 'FRAME') {
      return null;
    }

    const testDataStr = frame.getPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS);
    const state = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE) as FrameState || 'ready';
    
    if (testDataStr) {
      const testData = JSON.parse(testDataStr) as FrameTestData;
      testData.state = state; // Ensure state is current
      return testData;
    }
    
    return {
      frameId,
      frameName: frame.name,
      state,
      history: []
    };
    
  } catch (error) {
    console.error('Error getting frame test data:', error);
    return null;
  }
}

// Send frame states to UI
async function sendFrameStates() {
  try {
    const frames = figma.currentPage.findAll(node => node.type === 'FRAME') as FrameNode[];
    const frameStates = [];
    
    for (const frame of frames) {
      const testData = await getFrameTestData(frame.id);
      if (testData) {
        frameStates.push({
          frameId: frame.id,
          frameName: frame.name,
          state: testData.state,
          lastTested: testData.lastTested,
          hasResults: !!testData.currentResult
        });
      }
    }
    
    const frameStatesMessage = {
      type: 'frame-states',
      data: frameStates
    };
    debugPostMessage(frameStatesMessage, 'frame-states');
    
  } catch (error) {
    console.error('Error sending frame states:', error);
  }
}

// Send test history for a specific frame
async function sendTestHistory(frameId: string) {
  try {
    const testData = await getFrameTestData(frameId);
    
    const historyMessage = {
      type: 'test-history',
      data: {
        frameId,
        history: testData && testData.history || [],
        currentResult: testData && testData.currentResult
      }
    };
    debugPostMessage(historyMessage, 'test-history');
    
  } catch (error) {
    console.error('Error sending test history:', error);
  }
}

// Clear all data for a frame
async function clearFrameData(frameId: string) {
  try {
    const frame = figma.getNodeById(frameId) as FrameNode;
    if (frame && frame.type === 'FRAME') {
      // Clear plugin data
      frame.setPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS, '');
      frame.setPluginData(PLUGIN_DATA_KEYS.FRAME_STATE, '');
      
      // Remove status indicator
      const indicator = frame.children.find(child => 
        child.name === 'Synthetic Testing Status'
      );
      if (indicator) {
        indicator.remove();
      }
      
      // Reset to ready state
      await updateFrameState(frameId, 'ready');
    }
    
    const clearDataMessage = {
      type: 'frame-data-cleared',
      data: { frameId, success: true }
    };
    debugPostMessage(clearDataMessage, 'frame-data-cleared');
    
  } catch (error) {
    console.error('Error clearing frame data:', error);
    const errorMessage = {
      type: 'error',
      message: `Failed to clear frame data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    debugPostMessage(errorMessage, 'clear-frame-data-error');
  }
}

// Update status indicators for all frames
async function updateAllFrameIndicators() {
  try {
    const frames = figma.currentPage.findAll(node => node.type === 'FRAME') as FrameNode[];
    
    for (const frame of frames) {
      const state = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE) as FrameState;
      if (state) {
        await updateFrameIndicator(frame, state);
      }
    }
  } catch (error) {
    console.error('Error updating frame indicators:', error);
  }
}

// Migrate plugin data for version compatibility
async function migratePluginData() {
  try {
    const currentVersion = '1.0.0';
    const storedVersion = figma.root.getPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION);
    
    if (!storedVersion) {
      // First time setup
      figma.root.setPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION, currentVersion);
      console.log('Plugin data initialized');
    } else if (storedVersion !== currentVersion) {
      // Handle migrations here if needed
      figma.root.setPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION, currentVersion);
      console.log(`Plugin data migrated from ${storedVersion} to ${currentVersion}`);
    }
  } catch (error) {
    console.error('Error migrating plugin data:', error);
  }
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize plugin
console.log('Synthetic User Testing plugin loaded');