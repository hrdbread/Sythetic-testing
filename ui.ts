// Import Claude API and personas
import { ClaudeAPIClient, FrameAnalysisResult, PersonaAnalysis, Issue } from './claude-api';
import { Persona, standardPersonas, accessibilityPersonas, getPersonaById } from './personas';
import { ReportGenerator, ReportData } from './report-generator';

// TypeScript types and interfaces
interface FrameMetadata {
  hasText: boolean;
  hasButtons: boolean;
  hasImages: boolean;
  textCount: number;
  buttonCount: number;
  imageCount: number;
  components: string[];
}

interface CapturedFrame {
  id: string;
  name: string;
  image: string;
  metadata: FrameMetadata;
  dimensions: {
    width: number;
    height: number;
  };
  state?: string;
  lastTested?: Date;
  hasHistory?: boolean;
}

interface HistoryItem {
  id: string;
  timestamp: Date;
  overallScore: number;
  categoryScores: Record<string, number>;
  issues: Issue[];
  personas: string[];
}

interface Settings {
  apiKey: string;
  model: string;
  maxTokens: number;
}

interface UserType {
  id: string;
  name: string;
  enabled: boolean;
}

interface TestResult {
  category: 'usability' | 'accessibility' | 'visual' | 'interaction';
  score: number;
  maxScore: number;
  status: 'red' | 'yellow' | 'green';
  issues: string[];
}

interface TestResults {
  overall: {
    score: number;
    maxScore: number;
    status: 'red' | 'yellow' | 'green';
  };
  categories: TestResult[];
  detailedResults?: FrameAnalysisResult[];
}

interface PluginMessage {
  type: 'capture-frames' | 'frames-captured' | 'error' | 'cancel' | 'frame-states' | 'test-history' | 'test-results-saved' | 'selection-update' | 'success' | 'test';
  data?: any;
  message?: string;
}

// Global state
let capturedFrames: CapturedFrame[] = [];
let currentResults: TestResults | null = null;
let claudeClient: ClaudeAPIClient | null = null;
let reportGenerator: ReportGenerator | null = null;
let testHistory: Record<string, HistoryItem[]> = {};
let currentSettings: Settings = {
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4000
};
let progressStartTime: number = 0;
let keyboardShortcutsVisible = false;

// Initialize Claude API client
function initializeClaudeClient(): boolean {
  // In a real implementation, you'd get the API key from settings or environment
  const apiKey = localStorage.getItem('claude-api-key') || '';
  
  if (!apiKey) {
    showError('Claude API key not configured. Please add your API key in settings.');
    return false;
  }
  
  try {
    claudeClient = new ClaudeAPIClient({ apiKey });
    return true;
  } catch (error) {
    showError('Failed to initialize Claude API client');
    return false;
  }
}

// DOM elements - will be initialized after DOM loads
let captureBtn: HTMLButtonElement | null = null;
let runTestBtn: HTMLButtonElement | null = null;
let frameList: HTMLElement | null = null;
let frameCount: HTMLElement | null = null;
let captureEmpty: HTMLElement | null = null;
let progressContainer: HTMLElement | null = null;
let progressFill: HTMLElement | null = null;
let progressText: HTMLElement | null = null;
let errorContainer: HTMLElement | null = null;
let errorMessage: HTMLElement | null = null;
let resultsEmpty: HTMLElement | null = null;
let resultsContent: HTMLElement | null = null;
let overallStatus: HTMLElement | null = null;
let overallScore: HTMLElement | null = null;

// Enhanced DOM elements - will be initialized after DOM loads
let settingsBtn: HTMLButtonElement | null = null;
let historyBtn: HTMLButtonElement | null = null;
let exportBtn: HTMLButtonElement | null = null;
let settingsModal: HTMLElement | null = null;
let historyModal: HTMLElement | null = null;
let exportModal: HTMLElement | null = null;
let keyboardShortcuts: HTMLElement | null = null;
let enhancedProgressContainer: HTMLElement | null = null;
let enhancedProgressFill: HTMLElement | null = null;
let enhancedProgressText: HTMLElement | null = null;
let currentStepEl: HTMLElement | null = null;
let progressETA: HTMLElement | null = null;

// Map UI checkboxes to actual personas
const personaMapping: Record<string, string> = {
  'user-novice': 'senior',  // Maps to Margaret - Senior User
  'user-intermediate': 'mobile-user',  // Maps to Jordan - Mobile-First User  
  'user-expert': 'tech-savvy',  // Maps to Alex - Tech-Savvy Professional
  'user-accessibility': 'screen-reader'  // Maps to Maria - Screen Reader User
};

// User type checkboxes
const userTypes: UserType[] = [
  { id: 'user-novice', name: 'Novice User', enabled: true },
  { id: 'user-intermediate', name: 'Intermediate User', enabled: true },
  { id: 'user-expert', name: 'Expert User', enabled: false },
  { id: 'user-accessibility', name: 'Accessibility User', enabled: false }
];

// Basic button click handlers - will be set up after DOM loads
function handleCaptureClick() {
  console.log('🔥 CAPTURE BUTTON CLICKED - Starting frame capture process');
  console.log('📤 Sending capture-frames message to plugin');
  console.log('Button state:', {
    disabled: captureBtn?.disabled,
    textContent: captureBtn?.textContent,
    timestamp: new Date().toISOString()
  });
  
  parent.postMessage({ pluginMessage: { type: 'capture-frames' } }, '*');
  console.log('✅ Message sent to plugin code');
}

function handleRunTestClick() {
  console.log('🧪 RUN TEST BUTTON CLICKED');
  runSyntheticTests();
}

// Basic click handlers for other buttons
function handleSettingsClick() {
  console.log('⚙️ SETTINGS BUTTON CLICKED');
  openSettingsModal();
}

function handleHistoryClick() {
  console.log('📊 HISTORY BUTTON CLICKED');
  openHistoryModal();
}

function handleExportClick() {
  console.log('📄 EXPORT BUTTON CLICKED');
  openExportModal();
}

function handleSaveSettingsClick() {
  console.log('💾 SAVE SETTINGS CLICKED');
  saveSettings();
}

function handleTestConnectionClick() {
  console.log('🔗 TEST CONNECTION CLICKED');
  testConnection();
}

function handleConfirmExportClick() {
  console.log('✅ CONFIRM EXPORT CLICKED');
  confirmExport();
}

function handleCancelExportClick() {
  console.log('❌ CANCEL EXPORT CLICKED');
  closeModal('export-modal');
}

function handleExportHtmlClick() {
  console.log('📄 EXPORT HTML CLICKED');
  exportReport('html');
}

function handleExportPdfClick() {
  console.log('📑 EXPORT PDF CLICKED');
  exportReport('pdf');
}

// Enhanced plugin message logging and processing
function logPluginMessage(msg: PluginMessage, format: 'figma-wrapped' | 'figma-direct') {
  console.log('📨 UI THREAD RECEIVED PLUGIN MESSAGE:', {
    type: msg.type,
    hasData: !!msg.data,
    dataKeys: msg.data ? Object.keys(msg.data) : [],
    message: msg.message,
    timestamp: new Date().toISOString(),
    messageFormat: format,
    isCorrectFigmaFormat: format === 'figma-wrapped'
  });
}

// Enhanced message listener for Figma plugin communication
function setupMessageListener() {
  console.log('🔧 Setting up proper Figma plugin message listener');
  
  // FIXED: Figma actually wraps messages in event.data.pluginMessage
  console.log('🎯 Setting window.onmessage handler for Figma plugin messages');
  window.onmessage = (event: MessageEvent) => {
    console.log('📨 RAW MESSAGE RECEIVED from Figma main thread:', {
      origin: event.origin,
      hasPluginMessage: !!event.data.pluginMessage,
      hasDirectMessage: !!(event.data.type),
      eventData: event.data,
      timestamp: new Date().toISOString()
    });
    
    // Filter out Figma devtools bridge messages first
    if (event.data.type && event.data.type.startsWith('figma-devtools')) {
      console.log('🔧 Figma devtools bridge message - ignoring');
      return;
    }
    
    let msg: any;
    
    // CORRECT: figma.ui.postMessage() actually sends messages wrapped in pluginMessage
    if (event.data.pluginMessage) {
      console.log('✅ FIGMA PLUGIN MESSAGE DETECTED (wrapped in pluginMessage)');
      console.log('📦 Plugin message content:', event.data.pluginMessage);
      msg = event.data.pluginMessage;
      logPluginMessage(msg, 'figma-wrapped');
    } else if (event.data.type) {
      console.log('⚠️ Direct message format detected (fallback)');
      console.log('📦 Plugin message content:', event.data);
      msg = event.data;
      logPluginMessage(msg, 'figma-direct');
    } else {
      console.log('❌ Unknown message format - ignoring:', event.data);
      return;
    }
    
    handlePluginMessage(msg);
  };
  
  // Debug: Verify handler is attached
  console.log('🔍 Handler verification:', {
    windowOnmessage: typeof window.onmessage,
    windowOnmessageExists: window.onmessage !== null && window.onmessage !== undefined,
    functionName: 'Figma plugin message handler'
  });
  
  console.log('✅ Figma plugin message listener setup complete');
}

// Handle plugin messages
function handlePluginMessage(msg: PluginMessage) {
  switch (msg.type) {
    case 'frames-captured':
      console.log('🎯 Processing frames-captured message');
      console.log('📊 Frame data received:', {
        frameCount: msg.data ? msg.data.length : 0,
        frames: msg.data ? msg.data.map((f: any) => ({ name: f.name, id: f.id, hasImage: !!f.image })) : []
      });
      handleFramesCaptured(msg.data);
      break;
    case 'error':
      console.log('❌ Error message received:', msg.message);
      showError(msg.message || 'An unknown error occurred');
      break;
    case 'success':
      console.log('✅ Success message received:', msg.message);
      showSuccess(msg.message || 'Operation completed successfully');
      break;
    case 'selection-update':
      console.log('🔄 Selection update received:', msg.data);
      handleSelectionUpdate(msg.data);
      break;
    case 'frame-states':
      console.log('📊 Frame states received:', msg.data);
      updateFrameStatesDisplay(msg.data);
      break;
    case 'test-history':
      console.log('📜 Test history received');
      displayHistory(msg.data.history || []);
      break;
    case 'test-results-saved':
      console.log('💾 Test results saved confirmation');
      showSuccess('Test results saved successfully');
      break;
    case 'test':
      console.log('🧪 Test message received:', msg.message);
      console.log('✅ Message handler is working correctly!');
      break;
    default:
      console.warn('⚠️ Unknown message type received:', msg.type);
  }
}

// Handle captured frames
function handleFramesCaptured(frames: CapturedFrame[]) {
  console.log('🎯 HANDLING CAPTURED FRAMES - Start');
  console.log('📊 Frames received:', {
    count: frames ? frames.length : 0,
    isArray: Array.isArray(frames),
    frames: frames ? frames.map(f => ({
      name: f.name,
      id: f.id,
      hasImage: !!f.image,
      imageLength: f.image ? f.image.length : 0,
      dimensions: f.dimensions
    })) : 'No frames'
  });

  capturedFrames = frames || [];
  console.log('💾 Stored frames in capturedFrames:', capturedFrames.length);
  
  console.log('🔄 Updating frame list...');
  updateFrameList();
  
  console.log('🔘 Updating run test button...');
  updateRunTestButton();
  
  console.log('🚫 Hiding errors...');
  hideError();
  
  console.log('✅ HANDLING CAPTURED FRAMES - Complete');
}

// Handle selection updates from plugin
function handleSelectionUpdate(data: any) {
  console.log('🔄 HANDLING SELECTION UPDATE - Start');
  console.log('📊 Selection data received:', {
    hasData: !!data,
    validFrames: data ? data.validFrames : 'unknown',
    totalCount: data ? data.count : 'unknown',
    message: data ? data.message : 'no message',
    frameNames: data ? data.frameNames : 'no names'
  });
  
  if (!data) {
    console.log('❌ No selection data received');
    return;
  }
  
  // Update capture empty state with selection info
  if (captureEmpty) {
    console.log('📝 Updating capture empty state');
  } else {
    console.log('❌ captureEmpty element not found');
  }
  
  if (captureEmpty) {
    if (data.validFrames > 0) {
      captureEmpty.innerHTML = `
        <div style="color: #14cf82; margin-bottom: 8px;">
          ✅ ${data.validFrames} frame${data.validFrames === 1 ? '' : 's'} selected
        </div>
        <div style="font-size: 10px; color: #666;">
          ${data.frameNames ? data.frameNames.join(', ') : ''}
        </div>
        <div style="margin-top: 8px; font-size: 10px;">
          Click "Capture Selected Frames" to continue
        </div>
      `;
    } else if (data.count > 0) {
      captureEmpty.innerHTML = `
        <div style="color: #f24822; margin-bottom: 8px;">
          ⚠️ ${data.count} item${data.count === 1 ? '' : 's'} selected (not frames)
        </div>
        <div style="font-size: 10px; color: #666; margin-bottom: 8px;">
          ${data.message}
        </div>
        <div style="font-size: 10px;">
          Select frames, components, or instances in Figma
        </div>
      `;
    } else {
      captureEmpty.innerHTML = `
        <div style="margin-bottom: 8px;">
          Select frames or components in Figma and click "Capture Selected Frames"
        </div>
        <div style="font-size: 10px; color: #666;">
          💡 Tip: Look for rectangular containers (frames) or reusable components
        </div>
      `;
    }
  }
  
  // Update capture button state
  if (captureBtn) {
    console.log('🔘 Updating capture button state');
    if (data.validFrames > 0) {
      console.log('✅ Enabling capture button for', data.validFrames, 'frames');
      captureBtn.disabled = false;
      captureBtn.textContent = `Capture ${data.validFrames} Frame${data.validFrames === 1 ? '' : 's'}`;
      captureBtn.style.background = '#18a0fb';
    } else {
      console.log('🚫 Disabling capture button - no valid frames');
      captureBtn.disabled = true;
      captureBtn.textContent = 'Select Frames First';
      captureBtn.style.background = '#b3b3b3';
    }
    
    console.log('🎯 Button updated to:', {
      disabled: captureBtn.disabled,
      textContent: captureBtn.textContent,
      background: captureBtn.style.background
    });
  } else {
    console.log('❌ captureBtn element not found');
  }
  
  console.log('✅ HANDLING SELECTION UPDATE - Complete');
}

// Update frame list display
function updateFrameList() {
  console.log('🔄 UPDATE FRAME LIST - Start');
  console.log('📊 Current capturedFrames:', {
    count: capturedFrames.length,
    frames: capturedFrames.map(f => ({ name: f.name, hasImage: !!f.image }))
  });
  
  if (!frameList || !captureEmpty || !frameCount) {
    console.log('❌ Required DOM elements not found for updateFrameList');
    return;
  }
  
  if (capturedFrames.length === 0) {
    console.log('📭 No frames captured - showing empty state');
    frameList.classList.add('hidden');
    captureEmpty.classList.remove('hidden');
    frameCount.textContent = '0 frames';
    console.log('🎯 Frame count updated to: 0 frames');
    return;
  }

  console.log('📦 Frames available - updating UI');
  frameList.classList.remove('hidden');
  captureEmpty.classList.add('hidden');
  frameCount.textContent = `${capturedFrames.length} frame${capturedFrames.length === 1 ? '' : 's'}`;
  console.log('🎯 Frame count updated to:', frameCount.textContent);

  console.log('🧹 Clearing existing frame list HTML');
  frameList.innerHTML = '';
  
  console.log('🔄 Creating frame items...');
  capturedFrames.forEach((frame, index) => {
    console.log(`📝 Creating frame item ${index + 1}:`, { name: frame.name, id: frame.id });
    const frameItem = document.createElement('div');
    frameItem.className = 'frame-item';
    frameItem.setAttribute('data-frame-id', frame.id);
    
    const statusClass = frame.state ? `status-${frame.state}` : 'status-ready';
    const lastTestedText = frame.lastTested ? 
      `Last tested: ${new Date(frame.lastTested).toLocaleDateString()}` : 
      'Not tested';
    
    frameItem.innerHTML = `
      <img class="frame-thumbnail" src="${frame.image}" alt="${frame.name}">
      <div class="frame-info">
        <div class="frame-name">${frame.name}</div>
        <div class="frame-dimensions">${Math.round(frame.dimensions.width)} × ${Math.round(frame.dimensions.height)}</div>
        <div class="frame-dimensions">${lastTestedText}</div>
      </div>
      <div class="frame-status ${statusClass}" title="${frame.state || 'ready'}"></div>
    `;
    
    // Add click handler for frame history
    if (frame.hasHistory) {
      frameItem.style.cursor = 'pointer';
      frameItem.onclick = function() {
        console.log('📊 Frame history clicked for:', frame.name);
        parent.postMessage({ pluginMessage: { type: 'get-test-history', data: { frameId: frame.id } } }, '*');
        openHistoryModal();
      };
    }
    
    frameList.appendChild(frameItem);
  });
}

// Update run test button state
function updateRunTestButton() {
  if (!runTestBtn) {
    console.log('❌ runTestBtn not found in updateRunTestButton');
    return;
  }
  
  const hasFrames = capturedFrames.length > 0;
  const hasSelectedUserTypes = getSelectedUserTypes().length > 0;
  const hasAPIKeyAvailable = hasAPIKey();
  
  runTestBtn.disabled = !hasFrames || !hasSelectedUserTypes;
  
  // Update button text based on API key status
  if (!hasAPIKeyAvailable) {
    runTestBtn.textContent = 'Configure API Key';
    runTestBtn.onclick = function() {
      console.log('🔑 Configure API Key clicked');
      if (promptForAPIKey()) {
        runTestBtn!.textContent = 'Run Synthetic Tests';
        runTestBtn!.onclick = function() {
          console.log('🧪 Run Tests clicked (after API key setup)');
          runSyntheticTests();
        };
        updateRunTestButton();
      }
    };
  } else {
    runTestBtn.textContent = 'Run Synthetic Tests';
    runTestBtn.onclick = function() {
      console.log('🧪 Run Tests clicked');
      runSyntheticTests();
    };
  }
}

// Get selected user types
function getSelectedUserTypes(): UserType[] {
  return userTypes.filter(userType => {
    const checkbox = document.getElementById(userType.id) as HTMLInputElement;
    return checkbox && checkbox.checked;
  });
}

// Get selected personas for testing
function getSelectedPersonas(): Persona[] {
  const selectedUserTypes = getSelectedUserTypes();
  const personas: Persona[] = [];
  
  selectedUserTypes.forEach(userType => {
    const personaId = personaMapping[userType.id];
    if (personaId) {
      const persona = getPersonaById(personaId);
      if (persona) {
        personas.push(persona);
      }
    }
  });
  
  // Always include busy parent for comprehensive testing
  const busyParent = getPersonaById('busy-parent');
  if (busyParent && !personas.find(p => p.id === 'busy-parent')) {
    personas.push(busyParent);
  }
  
  return personas;
}

// Run synthetic tests with Claude API
async function runSyntheticTests() {
  try {
    showEnhancedProgress();
    hideError();
    
    // Initialize Claude client if needed
    if (!claudeClient && !initializeClaudeClient()) {
      hideEnhancedProgress();
      return;
    }
    
    const selectedPersonas = getSelectedPersonas();
    
    if (selectedPersonas.length === 0) {
      hideEnhancedProgress();
      showError('No personas selected for testing');
      return;
    }
    
    // Step 1: Test API connection
    updateEnhancedProgress(10, 1, 5, 'Testing API connection...');
    const isConnected = await claudeClient!.testConnection();
    if (!isConnected) {
      hideEnhancedProgress();
      showError('Cannot connect to Claude API. Please check your API key and internet connection.');
      return;
    }
    
    // Step 2: Prepare analysis
    updateEnhancedProgress(20, 2, 5, 'Preparing frame analysis...');
    const frameResults: FrameAnalysisResult[] = [];
    const totalFrames = capturedFrames.length;
    
    // Step 3: Run analysis for each frame
    for (let i = 0; i < capturedFrames.length; i++) {
      const frame = capturedFrames[i];
      const stepProgress = 20 + ((i / totalFrames) * 50); // 20-70%
      
      updateEnhancedProgress(
        stepProgress, 
        3, 
        5, 
        `Analyzing frame ${i + 1}/${totalFrames}: ${frame.name}`
      );
      
      try {
        const result = await claudeClient!.analyzeFrame(
          frame.image,
          frame.name,
          frame.id,
          selectedPersonas,
          frame.metadata
        );
        frameResults.push(result);
        
        // Save results to plugin data
        parent.postMessage({
          pluginMessage: {
            type: 'save-test-results',
            data: {
              frameId: frame.id,
              results: {
                overallScore: result.overallScore,
                categoryScores: calculateCategoryScores(result.analyses),
                issues: result.aggregatedIssues,
                personas: selectedPersonas.map(p => p.id)
              }
            }
          }
        }, '*');
        
      } catch (error) {
        console.error(`Failed to analyze frame ${frame.name}:`, error);
        showError(`Warning: Analysis failed for frame "${frame.name}". Continuing with other frames.`);
      }
    }
    
    if (frameResults.length === 0) {
      hideEnhancedProgress();
      showError('All frame analyses failed. Please check your API configuration.');
      return;
    }
    
    // Step 4: Process results
    updateEnhancedProgress(80, 4, 5, 'Processing and aggregating results...');
    const results = convertClaudeResultsToUI(frameResults);
    currentResults = results;
    
    // Step 5: Finalize
    updateEnhancedProgress(100, 5, 5, 'Analysis complete!');
    
    setTimeout(() => {
      hideEnhancedProgress();
      displayResults(results);
      showSuccess(`Analysis completed! Tested ${frameResults.length} frames with ${selectedPersonas.length} personas.`);
    }, 500);
    
  } catch (error) {
    hideEnhancedProgress();
    showError(`Testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to calculate category scores from analyses
function calculateCategoryScores(analyses: PersonaAnalysis[]) {
  if (analyses.length === 0) {
    return { usability: 0, accessibility: 0, visual: 0, interaction: 0 };
  }
  
  const totals = { usability: 0, accessibility: 0, visual: 0, interaction: 0 };
  analyses.forEach(analysis => {
    totals.usability += analysis.categoryScores.usability;
    totals.accessibility += analysis.categoryScores.accessibility;
    totals.visual += analysis.categoryScores.visual;
    totals.interaction += analysis.categoryScores.interaction;
  });
  
  return {
    usability: Math.round(totals.usability / analyses.length),
    accessibility: Math.round(totals.accessibility / analyses.length),
    visual: Math.round(totals.visual / analyses.length),
    interaction: Math.round(totals.interaction / analyses.length)
  };
}

// Helper functions for progress updates
function updateProgressText(text: string) {
  progressText.textContent = text;
}

function updateProgressBar(percentage: number) {
  progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

// Convert Claude API results to UI format
function convertClaudeResultsToUI(frameResults: FrameAnalysisResult[]): TestResults {
  if (frameResults.length === 0) {
    return {
      overall: { score: 0, maxScore: 100, status: 'red' },
      categories: [
        { category: 'usability', score: 0, maxScore: 100, status: 'red', issues: [] },
        { category: 'accessibility', score: 0, maxScore: 100, status: 'red', issues: [] },
        { category: 'visual', score: 0, maxScore: 100, status: 'red', issues: [] },
        { category: 'interaction', score: 0, maxScore: 100, status: 'red', issues: [] }
      ],
      detailedResults: frameResults
    };
  }
  
  // Aggregate scores across all frames
  let totalUsability = 0;
  let totalAccessibility = 0;
  let totalVisual = 0;
  let totalInteraction = 0;
  let totalOverall = 0;
  
  const allIssues: Issue[] = [];
  
  frameResults.forEach(result => {
    totalOverall += result.overallScore;
    allIssues.push(...result.aggregatedIssues);
    
    // Average persona scores for each category
    if (result.analyses.length > 0) {
      const avgScores = {
        usability: result.analyses.reduce((sum, a) => sum + a.categoryScores.usability, 0) / result.analyses.length,
        accessibility: result.analyses.reduce((sum, a) => sum + a.categoryScores.accessibility, 0) / result.analyses.length,
        visual: result.analyses.reduce((sum, a) => sum + a.categoryScores.visual, 0) / result.analyses.length,
        interaction: result.analyses.reduce((sum, a) => sum + a.categoryScores.interaction, 0) / result.analyses.length
      };
      
      totalUsability += avgScores.usability;
      totalAccessibility += avgScores.accessibility;
      totalVisual += avgScores.visual;
      totalInteraction += avgScores.interaction;
    }
  });
  
  const frameCount = frameResults.length;
  const avgUsability = Math.round(totalUsability / frameCount);
  const avgAccessibility = Math.round(totalAccessibility / frameCount);
  const avgVisual = Math.round(totalVisual / frameCount);
  const avgInteraction = Math.round(totalInteraction / frameCount);
  const avgOverall = Math.round(totalOverall / frameCount);
  
  // Group issues by category
  const usabilityIssues = allIssues.filter(i => i.category === 'usability').map(i => i.description);
  const accessibilityIssues = allIssues.filter(i => i.category === 'accessibility').map(i => i.description);
  const visualIssues = allIssues.filter(i => i.category === 'visual').map(i => i.description);
  const interactionIssues = allIssues.filter(i => i.category === 'interaction').map(i => i.description);
  
  return {
    overall: {
      score: avgOverall,
      maxScore: 100,
      status: getStatusFromScore(avgOverall)
    },
    categories: [
      {
        category: 'usability',
        score: avgUsability,
        maxScore: 100,
        status: getStatusFromScore(avgUsability),
        issues: usabilityIssues.slice(0, 5) // Limit to top 5 issues
      },
      {
        category: 'accessibility',
        score: avgAccessibility,
        maxScore: 100,
        status: getStatusFromScore(avgAccessibility),
        issues: accessibilityIssues.slice(0, 5)
      },
      {
        category: 'visual',
        score: avgVisual,
        maxScore: 100,
        status: getStatusFromScore(avgVisual),
        issues: visualIssues.slice(0, 5)
      },
      {
        category: 'interaction',
        score: avgInteraction,
        maxScore: 100,
        status: getStatusFromScore(avgInteraction),
        issues: interactionIssues.slice(0, 5)
      }
    ],
    detailedResults: frameResults
  };
}

// Convert score to traffic light status
function getStatusFromScore(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

// API key management functions
function promptForAPIKey() {
  const apiKey = prompt('Please enter your Claude API key:');
  if (apiKey && apiKey.trim()) {
    localStorage.setItem('claude-api-key', apiKey.trim());
    return initializeClaudeClient();
  }
  return false;
}

function hasAPIKey(): boolean {
  return !!localStorage.getItem('claude-api-key');
}

// Display test results
function displayResults(results: TestResults) {
  // Show the entire results section
  const resultsSection = document.getElementById('results-section');
  if (resultsSection) resultsSection.classList.remove('hidden');
  
  // Show results content and hide empty state
  resultsEmpty.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  overallStatus.classList.remove('hidden');
  
  // Show export button when results are available
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.style.display = 'block';

  // Update overall score
  overallScore.textContent = `${results.overall.score}/${results.overall.maxScore}`;
  const overallIndicator = overallStatus.querySelector('.status-indicator') as HTMLElement;
  overallIndicator.className = `status-indicator status-${results.overall.status}`;

  // Update category scores
  results.categories.forEach(category => {
    const scoreElement = document.getElementById(`${category.category}-score`) as HTMLElement;
    const indicator = scoreElement.querySelector('.status-indicator') as HTMLElement;
    
    scoreElement.childNodes[1].textContent = `${category.score}/${category.maxScore}`;
    indicator.className = `status-indicator status-${category.status}`;
  });
  
  // Log detailed results for debugging
  if (results.detailedResults) {
    console.log('Detailed Analysis Results:', results.detailedResults);
  }
}

// Progress and error handling
function showProgress() {
  progressContainer.classList.remove('hidden');
  runTestBtn.disabled = true;
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting tests...';
}

function hideProgress() {
  progressContainer.classList.add('hidden');
  runTestBtn.disabled = false;
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorContainer.classList.remove('hidden');
}

function hideError() {
  errorContainer.classList.add('hidden');
}

// User type checkboxes are initialized in initializeUI()

// Initialize enhanced features
function initializeEnhancedFeatures() {
  // Initialize report generator
  reportGenerator = new ReportGenerator();
  
  // Load settings from localStorage
  loadSettings();
  
  // Request frame states from plugin
  parent.postMessage({ pluginMessage: { type: 'get-frame-states' } }, '*');
  
  // Show keyboard shortcuts hint
  setTimeout(() => {
    showKeyboardShortcuts();
    setTimeout(() => hideKeyboardShortcuts(), 3000);
  }, 1000);
}

// Modal management
function openSettingsModal() {
  loadSettingsToForm();
  if (settingsModal) {
    settingsModal.classList.remove('hidden');
    settingsModal.style.display = 'flex';
  }
}

function openHistoryModal() {
  loadTestHistory();
  if (historyModal) {
    historyModal.classList.remove('hidden');
    historyModal.style.display = 'flex';
  }
}

function openExportModal() {
  if (!currentResults) {
    showError('No test results to export');
    return;
  }
  if (exportModal) {
    exportModal.classList.remove('hidden');
    exportModal.style.display = 'flex';
  }
}

function closeModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// Settings management
function loadSettings() {
  const savedSettings = localStorage.getItem('synthetic-testing-settings');
  if (savedSettings) {
    try {
      currentSettings = { ...currentSettings, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

function saveSettings() {
  const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  const maxTokensInput = document.getElementById('max-tokens-input') as HTMLInputElement;
  
  currentSettings.apiKey = apiKeyInput.value.trim();
  currentSettings.model = modelSelect.value;
  currentSettings.maxTokens = parseInt(maxTokensInput.value) || 4000;
  
  localStorage.setItem('synthetic-testing-settings', JSON.stringify(currentSettings));
  localStorage.setItem('claude-api-key', currentSettings.apiKey); // For backward compatibility
  
  // Reinitialize Claude client
  if (currentSettings.apiKey) {
    claudeClient = new ClaudeAPIClient({
      apiKey: currentSettings.apiKey,
      model: currentSettings.model,
      maxTokens: currentSettings.maxTokens
    });
  }
  
  closeModal('settings-modal');
  updateRunTestButton();
  showSuccess('Settings saved successfully');
}

function loadSettingsToForm() {
  const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  const maxTokensInput = document.getElementById('max-tokens-input') as HTMLInputElement;
  
  if (apiKeyInput) apiKeyInput.value = currentSettings.apiKey;
  if (modelSelect) modelSelect.value = currentSettings.model;
  if (maxTokensInput) maxTokensInput.value = currentSettings.maxTokens.toString();
}

async function testConnection() {
  const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  const testBtn = document.getElementById('test-connection-btn') as HTMLButtonElement;
  
  if (!apiKeyInput.value.trim()) {
    showError('Please enter an API key first');
    return;
  }
  
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  
  try {
    const tempClient = new ClaudeAPIClient({ apiKey: apiKeyInput.value.trim() });
    const isConnected = await tempClient.testConnection();
    
    if (isConnected) {
      showSuccess('Connection successful!');
    } else {
      showError('Connection failed. Please check your API key.');
    }
  } catch (error) {
    showError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

// History management
function loadTestHistory() {
  const historyContent = document.getElementById('history-content');
  if (!historyContent) return;
  
  // Request history from plugin
  parent.postMessage({ pluginMessage: { type: 'get-test-history' } }, '*');
}

function displayHistory(history: HistoryItem[]) {
  const historyContent = document.getElementById('history-content');
  if (!historyContent) return;
  
  if (history.length === 0) {
    historyContent.innerHTML = '<div class="empty-state">No test history available</div>';
    return;
  }
  
  historyContent.innerHTML = `
    <div class="history-list">
      ${history.map(item => `
        <div class="history-item">
          <div class="history-header">
            <span class="history-score">${item.overallScore}/100</span>
            <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="history-details">
            ${item.issues.length} issues found • ${item.personas.length} personas tested
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Export functionality
function exportReport(format: 'html' | 'pdf') {
  if (!currentResults || !reportGenerator) {
    showError('No results to export');
    return;
  }
  
  const projectNameEl = document.getElementById('project-name-input') as HTMLInputElement;
  const projectName = projectNameEl && projectNameEl.value || 'Figma Project';
  
  const reportData: ReportData = {
    projectName,
    timestamp: new Date(),
    frameResults: currentResults.detailedResults || [],
    overallScore: currentResults.overall.score,
    totalFrames: capturedFrames.length,
    totalPersonas: getSelectedPersonas().length,
    summary: {
      criticalIssues: 0, // Calculate from results
      moderateIssues: 0,
      minorIssues: 0,
      topStrengths: []
    }
  };
  
  const html = reportGenerator.generateReport(reportData);
  
  if (format === 'html') {
    reportGenerator.exportReport(html, `${projectName}-synthetic-testing-report.html`);
  } else {
    // For PDF, open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 1000);
    }
  }
  
  closeModal('export-modal');
  showSuccess(`Report exported as ${format.toUpperCase()}`);
}

function confirmExport() {
  const formatEl = document.querySelector('input[name="export-format"]:checked') as HTMLInputElement;
  const format = formatEl && formatEl.value || 'html';
  exportReport(format as 'html' | 'pdf');
}

// Enhanced progress tracking
function showEnhancedProgress() {
  progressContainer.classList.add('hidden');
  if (enhancedProgressContainer) enhancedProgressContainer.classList.remove('hidden');
  progressStartTime = Date.now();
  updateProgressETA(0, 5);
}

function hideEnhancedProgress() {
  if (enhancedProgressContainer) enhancedProgressContainer.classList.add('hidden');
  progressContainer.classList.remove('hidden');
}

function updateEnhancedProgress(percentage: number, step: number, totalSteps: number, stepText: string) {
  if (enhancedProgressFill) enhancedProgressFill.style.width = `${percentage}%`;
  if (enhancedProgressText) enhancedProgressText.textContent = stepText;
  if (currentStepEl) currentStepEl.textContent = `Step ${step} of ${totalSteps}`;
  updateProgressETA(percentage, totalSteps);
}

function updateProgressETA(percentage: number, totalSteps: number) {
  if (!progressETA || percentage === 0) return;
  
  const elapsed = Date.now() - progressStartTime;
  const estimated = (elapsed / percentage) * 100;
  const remaining = Math.max(0, estimated - elapsed);
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  progressETA.textContent = `ETA: ${minutes}m ${seconds}s`;
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'c':
        e.preventDefault();
        captureBtn.click();
        break;
      case 'r':
        e.preventDefault();
        if (!runTestBtn.disabled) runTestBtn.click();
        break;
      case ',':
        e.preventDefault();
        openSettingsModal();
        break;
      case 'e':
        e.preventDefault();
        if (currentResults) openExportModal();
        break;
      case '?':
        e.preventDefault();
        toggleKeyboardShortcuts();
        break;
    }
  }
  
  if (e.key === 'Escape') {
    // Close any open modal
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
      (modal as HTMLElement).style.display = 'none';
    });
    hideKeyboardShortcuts();
  }
}

function showKeyboardShortcuts() {
  if (keyboardShortcuts) keyboardShortcuts.classList.remove('hidden');
  keyboardShortcutsVisible = true;
}

function hideKeyboardShortcuts() {
  if (keyboardShortcuts) keyboardShortcuts.classList.add('hidden');
  keyboardShortcutsVisible = false;
}

function toggleKeyboardShortcuts() {
  if (keyboardShortcutsVisible) {
    hideKeyboardShortcuts();
  } else {
    showKeyboardShortcuts();
  }
}

// Success message helper
function showSuccess(message: string) {
  // Reuse error container for success messages
  errorMessage.textContent = message;
  errorMessage.style.background = '#e8f5e8';
  errorMessage.style.borderColor = '#c3e6c3';
  errorMessage.style.color = '#2d5a2d';
  errorContainer.classList.remove('hidden');
  
  setTimeout(() => {
    errorContainer.classList.add('hidden');
    // Reset error styling
    errorMessage.style.background = '';
    errorMessage.style.borderColor = '';
    errorMessage.style.color = '';
  }, 3000);
}

// Remove duplicate - this is handled above

function updateFrameStatesDisplay(frameStates: any[]) {
  // Update frame list with state indicators
  frameStates.forEach(frameState => {
    const frameItem = document.querySelector(`[data-frame-id="${frameState.frameId}"]`);
    if (frameItem) {
      const statusEl = frameItem.querySelector('.frame-status');
      if (statusEl) {
        statusEl.className = `frame-status status-${frameState.state}`;
      }
    }
  });
}

// Initialize DOM elements after document loads
function initializeDOMElements() {
  console.log('🔧 INITIALIZING DOM ELEMENTS');
  
  // Get all DOM elements
  captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
  runTestBtn = document.getElementById('run-test-btn') as HTMLButtonElement;
  frameList = document.getElementById('frame-list') as HTMLElement;
  frameCount = document.getElementById('frame-count') as HTMLElement;
  captureEmpty = document.getElementById('capture-empty') as HTMLElement;
  progressContainer = document.getElementById('progress-container') as HTMLElement;
  progressFill = document.getElementById('progress-fill') as HTMLElement;
  progressText = document.getElementById('progress-text') as HTMLElement;
  errorContainer = document.getElementById('error-container') as HTMLElement;
  errorMessage = document.getElementById('error-message') as HTMLElement;
  resultsEmpty = document.getElementById('results-empty') as HTMLElement;
  resultsContent = document.getElementById('results-content') as HTMLElement;
  overallStatus = document.getElementById('overall-status') as HTMLElement;
  overallScore = document.getElementById('overall-score') as HTMLElement;
  
  // Enhanced elements
  settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  historyBtn = document.getElementById('history-btn') as HTMLButtonElement;
  exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  settingsModal = document.getElementById('settings-modal') as HTMLElement;
  historyModal = document.getElementById('history-modal') as HTMLElement;
  exportModal = document.getElementById('export-modal') as HTMLElement;
  keyboardShortcuts = document.getElementById('keyboard-shortcuts') as HTMLElement;
  enhancedProgressContainer = document.getElementById('enhanced-progress-container') as HTMLElement;
  enhancedProgressFill = document.getElementById('enhanced-progress-fill') as HTMLElement;
  enhancedProgressText = document.getElementById('enhanced-progress-text') as HTMLElement;
  currentStepEl = document.getElementById('current-step') as HTMLElement;
  progressETA = document.getElementById('progress-eta') as HTMLElement;
  
  // Log which elements were found
  console.log('📋 DOM Elements Status:', {
    captureBtn: !!captureBtn,
    runTestBtn: !!runTestBtn,
    frameList: !!frameList,
    settingsBtn: !!settingsBtn,
    historyBtn: !!historyBtn,
    exportBtn: !!exportBtn
  });
}

// Set up all button event handlers
function setupButtonHandlers() {
  console.log('🎯 SETTING UP BUTTON HANDLERS');
  
  // Main buttons with both addEventListener and onclick fallback
  if (captureBtn) {
    console.log('✅ Setting up capture button handler');
    captureBtn.onclick = handleCaptureClick;
    try {
      captureBtn.addEventListener('click', handleCaptureClick);
    } catch (e) {
      console.log('⚠️ addEventListener failed for capture button, using onclick only');
    }
  } else {
    console.log('❌ Capture button not found!');
  }
  
  if (runTestBtn) {
    console.log('✅ Setting up run test button handler');
    runTestBtn.onclick = handleRunTestClick;
    try {
      runTestBtn.addEventListener('click', handleRunTestClick);
    } catch (e) {
      console.log('⚠️ addEventListener failed for run test button, using onclick only');
    }
  } else {
    console.log('❌ Run test button not found!');
  }
  
  // Other buttons
  if (settingsBtn) {
    settingsBtn.onclick = handleSettingsClick;
  }
  if (historyBtn) {
    historyBtn.onclick = handleHistoryClick;
  }
  if (exportBtn) {
    exportBtn.onclick = handleExportClick;
  }
  
  // Modal buttons with safe element finding
  const saveSettingsEl = document.getElementById('save-settings-btn');
  if (saveSettingsEl) {
    (saveSettingsEl as HTMLButtonElement).onclick = handleSaveSettingsClick;
  }
  
  const testConnectionEl = document.getElementById('test-connection-btn');
  if (testConnectionEl) {
    (testConnectionEl as HTMLButtonElement).onclick = handleTestConnectionClick;
  }
  
  const confirmExportEl = document.getElementById('confirm-export-btn');
  if (confirmExportEl) {
    (confirmExportEl as HTMLButtonElement).onclick = handleConfirmExportClick;
  }
  
  const cancelExportEl = document.getElementById('cancel-export-btn');
  if (cancelExportEl) {
    (cancelExportEl as HTMLButtonElement).onclick = handleCancelExportClick;
  }
  
  const exportHtmlEl = document.getElementById('export-html-btn');
  if (exportHtmlEl) {
    (exportHtmlEl as HTMLButtonElement).onclick = handleExportHtmlClick;
  }
  
  const exportPdfEl = document.getElementById('export-pdf-btn');
  if (exportPdfEl) {
    (exportPdfEl as HTMLButtonElement).onclick = handleExportPdfClick;
  }
  
  // Modal close buttons
  const closeSettingsEl = document.getElementById('close-settings');
  if (closeSettingsEl) {
    (closeSettingsEl as HTMLButtonElement).onclick = function() {
      console.log('❌ Close settings clicked');
      closeModal('settings-modal');
    };
  }
  
  const closeHistoryEl = document.getElementById('close-history');
  if (closeHistoryEl) {
    (closeHistoryEl as HTMLButtonElement).onclick = function() {
      console.log('❌ Close history clicked');
      closeModal('history-modal');
    };
  }
  
  const closeExportEl = document.getElementById('close-export');
  if (closeExportEl) {
    (closeExportEl as HTMLButtonElement).onclick = function() {
      console.log('❌ Close export clicked');
      closeModal('export-modal');
    };
  }
  
  console.log('✅ Button handlers setup complete');
}

// Initialize UI to proper startup state
function initializeUI() {
  console.log('🚀 INITIALIZING UI');
  
  // Message listener is already set up immediately when script loads
  // Verify it's still working
  console.log('🔍 Verifying message handler during UI init:', {
    windowOnmessage: typeof window.onmessage,
    handlerExists: window.onmessage !== null,
    handlerName: window.onmessage?.name || 'anonymous'
  });
  
  // Initialize DOM elements
  initializeDOMElements();
  
  // Set up button handlers
  setupButtonHandlers();
  
  // Hide all modals on startup
  if (settingsModal) {
    settingsModal.classList.add('hidden');
    settingsModal.style.display = 'none';
  }
  if (historyModal) {
    historyModal.classList.add('hidden');
    historyModal.style.display = 'none';
  }
  if (exportModal) {
    exportModal.classList.add('hidden');
    exportModal.style.display = 'none';
  }
  if (keyboardShortcuts) {
    keyboardShortcuts.classList.add('hidden');
    keyboardShortcuts.style.display = 'none';
  }
  
  // Hide entire results section initially
  const resultsSection = document.getElementById('results-section');
  if (resultsSection) resultsSection.classList.add('hidden');
  
  // Hide results content and show empty state
  if (resultsContent) resultsContent.classList.add('hidden');
  if (resultsEmpty) resultsEmpty.classList.remove('hidden');
  if (overallStatus) overallStatus.classList.add('hidden');
  
  // Hide export button initially
  if (exportBtn) exportBtn.style.display = 'none';
  
  // Hide progress containers
  if (progressContainer) progressContainer.classList.add('hidden');
  if (enhancedProgressContainer) enhancedProgressContainer.classList.add('hidden');
  
  // Hide error container
  if (errorContainer) errorContainer.classList.add('hidden');
  
  // Show capture empty state initially
  if (frameList) frameList.classList.add('hidden');
  if (captureEmpty) captureEmpty.classList.remove('hidden');
  if (frameCount) frameCount.textContent = '0 frames';
  
  // Reset captured frames and results
  capturedFrames = [];
  currentResults = null;
  
  // Initialize user type checkboxes
  userTypes.forEach(userType => {
    const checkbox = document.getElementById(userType.id) as HTMLInputElement;
    if (checkbox) {
      checkbox.onchange = function() {
        console.log(`☑️ Checkbox ${userType.id} changed to:`, checkbox.checked);
        updateRunTestButton();
      };
    }
  });
  
  // Initialize enhanced features
  initializeEnhancedFeatures();
  
  // Load settings and update button state
  loadSettings();
  updateRunTestButton();
  
  // Send UI ready signal and request current selection state
  console.log('📤 Sending ui-ready message to plugin');
  try {
    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
    console.log('✅ ui-ready message sent');
  } catch (error) {
    console.error('💥 Failed to send ui-ready message:', error);
  }
  
  // Also request current selection state
  console.log('📤 Requesting current selection state');
  try {
    parent.postMessage({ pluginMessage: { type: 'get-selection-state' } }, '*');
    console.log('✅ get-selection-state message sent');
  } catch (error) {
    console.error('💥 Failed to send get-selection-state message:', error);
  }
  
  console.log('✅ UI initialization complete');
  
  // Debug: Test if we can receive messages by setting up a test
  setTimeout(() => {
    console.log('🧪 TESTING MESSAGE RECEPTION - 5 seconds post-init');
    console.log('📊 Current UI state:', {
      captureBtn: {
        found: !!captureBtn,
        disabled: captureBtn ? captureBtn.disabled : 'not found',
        textContent: captureBtn ? captureBtn.textContent : 'not found'
      },
      frameCount: frameCount ? frameCount.textContent : 'not found',
      messageListenerActive: 'should be active'
    });
  }, 5000);
}

// =============================================================================
// CRITICAL: Set up message handler IMMEDIATELY when script loads
// This must happen BEFORE any DOM initialization or other setup
// =============================================================================
console.log('🎬 STARTING PLUGIN INITIALIZATION');
console.log('📄 Document ready state:', document.readyState);
console.log('💬 SETTING UP MESSAGE HANDLER IMMEDIATELY (before DOM ready)');

// Set up the message handler right now, before anything else
setupMessageListener();

// Add additional immediate verification
setTimeout(() => {
  console.log('🔍 IMMEDIATE HANDLER VERIFICATION (1 second later):');
  console.log('  window.onmessage type:', typeof window.onmessage);
  console.log('  window.onmessage exists:', window.onmessage !== null);
  console.log('  window.onmessage function:', window.onmessage?.name || 'anonymous');
}, 1000);

// Global function to test message handler (can be called from console)
(window as any).testMessageHandler = function() {
  console.log('🧪 TESTING FIGMA PLUGIN MESSAGE HANDLER:');
  console.log('  window.onmessage:', window.onmessage);
  console.log('  Type:', typeof window.onmessage);
  console.log('  Exists:', window.onmessage !== null && window.onmessage !== undefined);
  
  // Test with CORRECT Figma plugin message format (figma.ui.postMessage sends as event.data directly)
  const correctFigmaEvent = {
    data: { type: 'test', message: 'Correct Figma plugin message (direct from figma.ui.postMessage)' },
    origin: 'figma-plugin'
  } as MessageEvent;
  
  try {
    if (window.onmessage) {
      console.log('🔥 Testing CORRECT Figma format (figma.ui.postMessage -> event.data)...');
      window.onmessage(correctFigmaEvent);
      console.log('✅ Correct Figma plugin message handler executed successfully');
    } else {
      console.log('❌ window.onmessage is null or undefined');
    }
  } catch (error) {
    console.error('💥 Error calling handler:', error);
  }
  
  // Also test wrapped format for alternative cases
  const wrappedTestEvent = {
    data: { pluginMessage: { type: 'test', message: 'Wrapped format test (alternative)' } },
    origin: 'figma-wrapped'
  } as MessageEvent;
  
  try {
    if (window.onmessage) {
      console.log('🔥 Testing wrapped format (alternative)...');
      window.onmessage(wrappedTestEvent);
      console.log('✅ Wrapped format handler executed successfully');
    }
  } catch (error) {
    console.error('💥 Error calling wrapped format handler:', error);
  }
};

// Method 1: DOMContentLoaded (most reliable)
document.addEventListener('DOMContentLoaded', function() {
  console.log('📋 DOMContentLoaded event fired');
  initializeUI();
});

// Method 2: If DOM is already loaded
if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded');
} else {
  console.log('⚡ Document already loaded, initializing immediately');
  // Small delay to ensure elements are ready
  setTimeout(initializeUI, 10);
}

// Method 3: Window load as final fallback
window.addEventListener('load', function() {
  console.log('🏁 Window load event fired');
  // Only initialize if buttons aren't set up yet
  if (!captureBtn) {
    console.log('🔧 Fallback initialization from window load');
    initializeUI();
  }
});

// Method 4: Basic keyboard shortcuts (simple approach)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'c':
        e.preventDefault();
        if (captureBtn) {
          console.log('⌨️ Keyboard shortcut: Capture');
          handleCaptureClick();
        }
        break;
      case 'r':
        e.preventDefault();
        if (runTestBtn && !runTestBtn.disabled) {
          console.log('⌨️ Keyboard shortcut: Run tests');
          handleRunTestClick();
        }
        break;
    }
  }
  
  if (e.key === 'Escape') {
    // Close any open modal
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
      (modal as HTMLElement).style.display = 'none';
    });
  }
});