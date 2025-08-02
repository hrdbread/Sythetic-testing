// Minimal Figma Plugin - UI Thread (ui.js)
console.log('🎨 Minimal plugin UI started');

// Global state
let messageCount = 0;
let capturedCount = 0;

// DOM elements
const totalFramesEl = document.getElementById('total-frames');
const selectedFramesEl = document.getElementById('selected-frames');
const capturedFramesEl = document.getElementById('captured-frames');
const messageContainer = document.getElementById('message-container');
const lastMessageEl = document.getElementById('last-message');
const messageCountEl = document.getElementById('message-count');

const refreshBtn = document.getElementById('refresh-btn');
const captureBtn = document.getElementById('capture-btn');
const closeBtn = document.getElementById('close-btn');

// Debug DOM elements
console.log('🔍 DOM Elements Check:');
console.log('  totalFramesEl:', totalFramesEl);
console.log('  selectedFramesEl:', selectedFramesEl);
console.log('  capturedFramesEl:', capturedFramesEl);
console.log('  messageContainer:', messageContainer);
console.log('  lastMessageEl:', lastMessageEl);
console.log('  messageCountEl:', messageCountEl);
console.log('  refreshBtn:', refreshBtn);
console.log('  captureBtn:', captureBtn);
console.log('  closeBtn:', closeBtn);

// Message handler - THE MOST IMPORTANT PART
window.onmessage = (event) => {
  console.log('📨 UI received raw event:', event);
  console.log('📨 Event data:', event.data);
  console.log('📨 Event data type:', typeof event.data);
  console.log('📨 Event data keys:', Object.keys(event.data || {}));
  
  // Update debug info
  messageCount++;
  messageCountEl.textContent = messageCount;
  
  // Figma sends messages directly as event.data (not wrapped in pluginMessage)
  const msg = event.data;
  
  console.log('📨 Processing message:', msg);
  lastMessageEl.textContent = msg.type || 'unknown';
  
  // Handle different message types
  switch (msg.type) {
    case 'frame-count':
      console.log('📊 Received frame count message:', msg);
      console.log('📊 Frame count value:', msg.count);
      console.log('📊 totalFramesEl element:', totalFramesEl);
      
      if (totalFramesEl) {
        totalFramesEl.textContent = msg.count;
        console.log('✅ Updated totalFramesEl to:', msg.count);
      } else {
        console.error('❌ totalFramesEl element not found!');
      }
      break;
      
    case 'selection-changed':
      console.log('🔄 Selection changed:', msg.selectedFrames, 'frames selected');
      selectedFramesEl.textContent = msg.selectedFrames;
      // Enable/disable capture button based on selection
      captureBtn.disabled = msg.selectedFrames === 0;
      break;
      
    case 'capture-result':
      console.log('📸 Capture result:', msg);
      if (msg.success) {
        capturedCount = msg.capturedCount;
        capturedFramesEl.textContent = capturedCount;
        showMessage(`✅ ${msg.message}`, 'success');
        console.log('✅ Captured frames:', msg.frames);
      } else {
        showMessage(`❌ ${msg.message}`, 'error');
      }
      break;
      
    default:
      console.log('⚠️ Unknown message type:', msg.type);
  }
};

// Button event handlers
refreshBtn.onclick = () => {
  console.log('🔄 Refresh button clicked');
  console.log('📤 Sending get-frame-count message to main thread...');
  parent.postMessage({ pluginMessage: { type: 'get-frame-count' } }, '*');
};

captureBtn.onclick = () => {
  console.log('📸 Capture button clicked');
  console.log('📤 Sending capture-frames message to main thread...');
  parent.postMessage({ pluginMessage: { type: 'capture-frames' } }, '*');
};

closeBtn.onclick = () => {
  console.log('❌ Close button clicked');
  console.log('📤 Sending close-plugin message to main thread...');
  parent.postMessage({ pluginMessage: { type: 'close-plugin' } }, '*');
};

// Helper function to show messages
function showMessage(text, type = 'success') {
  console.log(`📢 Showing ${type} message:`, text);
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  
  messageContainer.innerHTML = '';
  messageContainer.appendChild(messageEl);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, 3000);
}

// Test message handler
function testMessageHandler() {
  console.log('🧪 Testing message handler...');
  const testEvent = {
    data: { type: 'frame-count', count: 99 }
  };
  window.onmessage(testEvent);
}

// Initialize UI
function initializeUI() {
  console.log('🚀 Initializing UI...');
  
  // Test message handler first
  console.log('🧪 Testing message handler...');
  const testEvent = {
    data: { type: 'frame-count', count: 42 }
  };
  window.onmessage(testEvent);
  
  // Request initial frame count
  console.log('📤 Requesting initial frame count...');
  console.log('📤 Sending message:', { pluginMessage: { type: 'get-frame-count' } });
  parent.postMessage({ pluginMessage: { type: 'get-frame-count' } }, '*');
  console.log('✅ Message sent to main thread');
  
  // Disable capture button initially
  captureBtn.disabled = true;
  
  console.log('✅ UI initialized');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

// Make test function available globally for debugging
window.testMessageHandler = testMessageHandler;

console.log('✅ UI script loaded');