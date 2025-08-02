"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const claude_api_1 = require("./claude-api");
const personas_1 = require("./personas");
const report_generator_1 = require("./report-generator");
let capturedFrames = [];
let currentResults = null;
let claudeClient = null;
let reportGenerator = null;
let testHistory = {};
let currentSettings = {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000
};
let progressStartTime = 0;
let keyboardShortcutsVisible = false;
function initializeClaudeClient() {
    const apiKey = localStorage.getItem('claude-api-key') || '';
    if (!apiKey) {
        showError('Claude API key not configured. Please add your API key in settings.');
        return false;
    }
    try {
        claudeClient = new claude_api_1.ClaudeAPIClient({ apiKey });
        return true;
    }
    catch (error) {
        showError('Failed to initialize Claude API client');
        return false;
    }
}
let captureBtn = null;
let runTestBtn = null;
let frameList = null;
let frameCount = null;
let captureEmpty = null;
let progressContainer = null;
let progressFill = null;
let progressText = null;
let errorContainer = null;
let errorMessage = null;
let resultsEmpty = null;
let resultsContent = null;
let overallStatus = null;
let overallScore = null;
let settingsBtn = null;
let historyBtn = null;
let exportBtn = null;
let settingsModal = null;
let historyModal = null;
let exportModal = null;
let keyboardShortcuts = null;
let enhancedProgressContainer = null;
let enhancedProgressFill = null;
let enhancedProgressText = null;
let currentStepEl = null;
let progressETA = null;
const personaMapping = {
    'user-novice': 'senior',
    'user-intermediate': 'mobile-user',
    'user-expert': 'tech-savvy',
    'user-accessibility': 'screen-reader'
};
const userTypes = [
    { id: 'user-novice', name: 'Novice User', enabled: true },
    { id: 'user-intermediate', name: 'Intermediate User', enabled: true },
    { id: 'user-expert', name: 'Expert User', enabled: false },
    { id: 'user-accessibility', name: 'Accessibility User', enabled: false }
];
function handleCaptureClick() {
    console.log('🔥 CAPTURE BUTTON CLICKED - Starting frame capture process');
    console.log('📤 Sending capture-frames message to plugin');
    console.log('Button state:', {
        disabled: captureBtn === null || captureBtn === void 0 ? void 0 : captureBtn.disabled,
        textContent: captureBtn === null || captureBtn === void 0 ? void 0 : captureBtn.textContent,
        timestamp: new Date().toISOString()
    });
    parent.postMessage({ pluginMessage: { type: 'capture-frames' } }, '*');
    console.log('✅ Message sent to plugin code');
}
function handleRunTestClick() {
    console.log('🧪 RUN TEST BUTTON CLICKED');
    runSyntheticTests();
}
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
function handleRawMessage(event) {
    console.log('📨 RAW MESSAGE RECEIVED:', {
        origin: event.origin,
        data: event.data,
        hasPluginMessage: !!event.data.pluginMessage,
        hasDirectMessage: !!(event.data.type),
        timestamp: new Date().toISOString()
    });
    let msg;
    if (event.data.pluginMessage) {
        console.log('🔍 Message format: pluginMessage wrapper detected');
        msg = event.data.pluginMessage;
    }
    else if (event.data.type) {
        console.log('🔍 Message format: Direct Figma message detected');
        msg = event.data;
    }
    else {
        console.log('⚠️ Received non-plugin message, ignoring:', event.data);
        return;
    }
    console.log('📨 UI THREAD RECEIVED PLUGIN MESSAGE:', {
        type: msg.type,
        hasData: !!msg.data,
        dataKeys: msg.data ? Object.keys(msg.data) : [],
        message: msg.message,
        timestamp: new Date().toISOString(),
        messageFormat: event.data.pluginMessage ? 'wrapped' : 'direct'
    });
    handlePluginMessage(msg);
}
function setupMessageListener() {
    var _a;
    console.log('🔧 Setting up message listener for plugin communication');
    console.log('🎯 Setting window.onmessage handler (Figma standard)');
    window.onmessage = handleRawMessage;
    console.log('🎯 Adding addEventListener message handler (backup)');
    window.addEventListener('message', handleRawMessage);
    console.log('🔍 Handler verification:', {
        windowOnmessage: typeof window.onmessage,
        windowOnmessageExists: window.onmessage !== null && window.onmessage !== undefined,
        functionName: ((_a = window.onmessage) === null || _a === void 0 ? void 0 : _a.name) || 'anonymous'
    });
    console.log('✅ Message listener setup complete with dual handlers');
}
function handlePluginMessage(msg) {
    switch (msg.type) {
        case 'frames-captured':
            console.log('🎯 Processing frames-captured message');
            console.log('📊 Frame data received:', {
                frameCount: msg.data ? msg.data.length : 0,
                frames: msg.data ? msg.data.map((f) => ({ name: f.name, id: f.id, hasImage: !!f.image })) : []
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
function handleFramesCaptured(frames) {
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
function handleSelectionUpdate(data) {
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
    if (captureEmpty) {
        console.log('📝 Updating capture empty state');
    }
    else {
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
        }
        else if (data.count > 0) {
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
        }
        else {
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
    if (captureBtn) {
        console.log('🔘 Updating capture button state');
        if (data.validFrames > 0) {
            console.log('✅ Enabling capture button for', data.validFrames, 'frames');
            captureBtn.disabled = false;
            captureBtn.textContent = `Capture ${data.validFrames} Frame${data.validFrames === 1 ? '' : 's'}`;
            captureBtn.style.background = '#18a0fb';
        }
        else {
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
    }
    else {
        console.log('❌ captureBtn element not found');
    }
    console.log('✅ HANDLING SELECTION UPDATE - Complete');
}
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
        if (frame.hasHistory) {
            frameItem.style.cursor = 'pointer';
            frameItem.onclick = function () {
                console.log('📊 Frame history clicked for:', frame.name);
                parent.postMessage({ pluginMessage: { type: 'get-test-history', data: { frameId: frame.id } } }, '*');
                openHistoryModal();
            };
        }
        frameList.appendChild(frameItem);
    });
}
function updateRunTestButton() {
    if (!runTestBtn) {
        console.log('❌ runTestBtn not found in updateRunTestButton');
        return;
    }
    const hasFrames = capturedFrames.length > 0;
    const hasSelectedUserTypes = getSelectedUserTypes().length > 0;
    const hasAPIKeyAvailable = hasAPIKey();
    runTestBtn.disabled = !hasFrames || !hasSelectedUserTypes;
    if (!hasAPIKeyAvailable) {
        runTestBtn.textContent = 'Configure API Key';
        runTestBtn.onclick = function () {
            console.log('🔑 Configure API Key clicked');
            if (promptForAPIKey()) {
                runTestBtn.textContent = 'Run Synthetic Tests';
                runTestBtn.onclick = function () {
                    console.log('🧪 Run Tests clicked (after API key setup)');
                    runSyntheticTests();
                };
                updateRunTestButton();
            }
        };
    }
    else {
        runTestBtn.textContent = 'Run Synthetic Tests';
        runTestBtn.onclick = function () {
            console.log('🧪 Run Tests clicked');
            runSyntheticTests();
        };
    }
}
function getSelectedUserTypes() {
    return userTypes.filter(userType => {
        const checkbox = document.getElementById(userType.id);
        return checkbox && checkbox.checked;
    });
}
function getSelectedPersonas() {
    const selectedUserTypes = getSelectedUserTypes();
    const personas = [];
    selectedUserTypes.forEach(userType => {
        const personaId = personaMapping[userType.id];
        if (personaId) {
            const persona = (0, personas_1.getPersonaById)(personaId);
            if (persona) {
                personas.push(persona);
            }
        }
    });
    const busyParent = (0, personas_1.getPersonaById)('busy-parent');
    if (busyParent && !personas.find(p => p.id === 'busy-parent')) {
        personas.push(busyParent);
    }
    return personas;
}
async function runSyntheticTests() {
    try {
        showEnhancedProgress();
        hideError();
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
        updateEnhancedProgress(10, 1, 5, 'Testing API connection...');
        const isConnected = await claudeClient.testConnection();
        if (!isConnected) {
            hideEnhancedProgress();
            showError('Cannot connect to Claude API. Please check your API key and internet connection.');
            return;
        }
        updateEnhancedProgress(20, 2, 5, 'Preparing frame analysis...');
        const frameResults = [];
        const totalFrames = capturedFrames.length;
        for (let i = 0; i < capturedFrames.length; i++) {
            const frame = capturedFrames[i];
            const stepProgress = 20 + ((i / totalFrames) * 50);
            updateEnhancedProgress(stepProgress, 3, 5, `Analyzing frame ${i + 1}/${totalFrames}: ${frame.name}`);
            try {
                const result = await claudeClient.analyzeFrame(frame.image, frame.name, frame.id, selectedPersonas, frame.metadata);
                frameResults.push(result);
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
            }
            catch (error) {
                console.error(`Failed to analyze frame ${frame.name}:`, error);
                showError(`Warning: Analysis failed for frame "${frame.name}". Continuing with other frames.`);
            }
        }
        if (frameResults.length === 0) {
            hideEnhancedProgress();
            showError('All frame analyses failed. Please check your API configuration.');
            return;
        }
        updateEnhancedProgress(80, 4, 5, 'Processing and aggregating results...');
        const results = convertClaudeResultsToUI(frameResults);
        currentResults = results;
        updateEnhancedProgress(100, 5, 5, 'Analysis complete!');
        setTimeout(() => {
            hideEnhancedProgress();
            displayResults(results);
            showSuccess(`Analysis completed! Tested ${frameResults.length} frames with ${selectedPersonas.length} personas.`);
        }, 500);
    }
    catch (error) {
        hideEnhancedProgress();
        showError(`Testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function calculateCategoryScores(analyses) {
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
function updateProgressText(text) {
    progressText.textContent = text;
}
function updateProgressBar(percentage) {
    progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}
function convertClaudeResultsToUI(frameResults) {
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
    let totalUsability = 0;
    let totalAccessibility = 0;
    let totalVisual = 0;
    let totalInteraction = 0;
    let totalOverall = 0;
    const allIssues = [];
    frameResults.forEach(result => {
        totalOverall += result.overallScore;
        allIssues.push(...result.aggregatedIssues);
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
                issues: usabilityIssues.slice(0, 5)
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
function getStatusFromScore(score) {
    if (score >= 80)
        return 'green';
    if (score >= 60)
        return 'yellow';
    return 'red';
}
function promptForAPIKey() {
    const apiKey = prompt('Please enter your Claude API key:');
    if (apiKey && apiKey.trim()) {
        localStorage.setItem('claude-api-key', apiKey.trim());
        return initializeClaudeClient();
    }
    return false;
}
function hasAPIKey() {
    return !!localStorage.getItem('claude-api-key');
}
function displayResults(results) {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection)
        resultsSection.classList.remove('hidden');
    resultsEmpty.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    overallStatus.classList.remove('hidden');
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn)
        exportBtn.style.display = 'block';
    overallScore.textContent = `${results.overall.score}/${results.overall.maxScore}`;
    const overallIndicator = overallStatus.querySelector('.status-indicator');
    overallIndicator.className = `status-indicator status-${results.overall.status}`;
    results.categories.forEach(category => {
        const scoreElement = document.getElementById(`${category.category}-score`);
        const indicator = scoreElement.querySelector('.status-indicator');
        scoreElement.childNodes[1].textContent = `${category.score}/${category.maxScore}`;
        indicator.className = `status-indicator status-${category.status}`;
    });
    if (results.detailedResults) {
        console.log('Detailed Analysis Results:', results.detailedResults);
    }
}
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
function showError(message) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
}
function hideError() {
    errorContainer.classList.add('hidden');
}
function initializeEnhancedFeatures() {
    reportGenerator = new report_generator_1.ReportGenerator();
    loadSettings();
    parent.postMessage({ pluginMessage: { type: 'get-frame-states' } }, '*');
    setTimeout(() => {
        showKeyboardShortcuts();
        setTimeout(() => hideKeyboardShortcuts(), 3000);
    }, 1000);
}
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
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
function loadSettings() {
    const savedSettings = localStorage.getItem('synthetic-testing-settings');
    if (savedSettings) {
        try {
            currentSettings = { ...currentSettings, ...JSON.parse(savedSettings) };
        }
        catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
}
function saveSettings() {
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const maxTokensInput = document.getElementById('max-tokens-input');
    currentSettings.apiKey = apiKeyInput.value.trim();
    currentSettings.model = modelSelect.value;
    currentSettings.maxTokens = parseInt(maxTokensInput.value) || 4000;
    localStorage.setItem('synthetic-testing-settings', JSON.stringify(currentSettings));
    localStorage.setItem('claude-api-key', currentSettings.apiKey);
    if (currentSettings.apiKey) {
        claudeClient = new claude_api_1.ClaudeAPIClient({
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
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const maxTokensInput = document.getElementById('max-tokens-input');
    if (apiKeyInput)
        apiKeyInput.value = currentSettings.apiKey;
    if (modelSelect)
        modelSelect.value = currentSettings.model;
    if (maxTokensInput)
        maxTokensInput.value = currentSettings.maxTokens.toString();
}
async function testConnection() {
    const apiKeyInput = document.getElementById('api-key-input');
    const testBtn = document.getElementById('test-connection-btn');
    if (!apiKeyInput.value.trim()) {
        showError('Please enter an API key first');
        return;
    }
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    try {
        const tempClient = new claude_api_1.ClaudeAPIClient({ apiKey: apiKeyInput.value.trim() });
        const isConnected = await tempClient.testConnection();
        if (isConnected) {
            showSuccess('Connection successful!');
        }
        else {
            showError('Connection failed. Please check your API key.');
        }
    }
    catch (error) {
        showError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
    }
}
function loadTestHistory() {
    const historyContent = document.getElementById('history-content');
    if (!historyContent)
        return;
    parent.postMessage({ pluginMessage: { type: 'get-test-history' } }, '*');
}
function displayHistory(history) {
    const historyContent = document.getElementById('history-content');
    if (!historyContent)
        return;
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
function exportReport(format) {
    if (!currentResults || !reportGenerator) {
        showError('No results to export');
        return;
    }
    const projectNameEl = document.getElementById('project-name-input');
    const projectName = projectNameEl && projectNameEl.value || 'Figma Project';
    const reportData = {
        projectName,
        timestamp: new Date(),
        frameResults: currentResults.detailedResults || [],
        overallScore: currentResults.overall.score,
        totalFrames: capturedFrames.length,
        totalPersonas: getSelectedPersonas().length,
        summary: {
            criticalIssues: 0,
            moderateIssues: 0,
            minorIssues: 0,
            topStrengths: []
        }
    };
    const html = reportGenerator.generateReport(reportData);
    if (format === 'html') {
        reportGenerator.exportReport(html, `${projectName}-synthetic-testing-report.html`);
    }
    else {
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
    const formatEl = document.querySelector('input[name="export-format"]:checked');
    const format = formatEl && formatEl.value || 'html';
    exportReport(format);
}
function showEnhancedProgress() {
    progressContainer.classList.add('hidden');
    if (enhancedProgressContainer)
        enhancedProgressContainer.classList.remove('hidden');
    progressStartTime = Date.now();
    updateProgressETA(0, 5);
}
function hideEnhancedProgress() {
    if (enhancedProgressContainer)
        enhancedProgressContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
}
function updateEnhancedProgress(percentage, step, totalSteps, stepText) {
    if (enhancedProgressFill)
        enhancedProgressFill.style.width = `${percentage}%`;
    if (enhancedProgressText)
        enhancedProgressText.textContent = stepText;
    if (currentStepEl)
        currentStepEl.textContent = `Step ${step} of ${totalSteps}`;
    updateProgressETA(percentage, totalSteps);
}
function updateProgressETA(percentage, totalSteps) {
    if (!progressETA || percentage === 0)
        return;
    const elapsed = Date.now() - progressStartTime;
    const estimated = (elapsed / percentage) * 100;
    const remaining = Math.max(0, estimated - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    progressETA.textContent = `ETA: ${minutes}m ${seconds}s`;
}
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'c':
                e.preventDefault();
                captureBtn.click();
                break;
            case 'r':
                e.preventDefault();
                if (!runTestBtn.disabled)
                    runTestBtn.click();
                break;
            case ',':
                e.preventDefault();
                openSettingsModal();
                break;
            case 'e':
                e.preventDefault();
                if (currentResults)
                    openExportModal();
                break;
            case '?':
                e.preventDefault();
                toggleKeyboardShortcuts();
                break;
        }
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        hideKeyboardShortcuts();
    }
}
function showKeyboardShortcuts() {
    if (keyboardShortcuts)
        keyboardShortcuts.classList.remove('hidden');
    keyboardShortcutsVisible = true;
}
function hideKeyboardShortcuts() {
    if (keyboardShortcuts)
        keyboardShortcuts.classList.add('hidden');
    keyboardShortcutsVisible = false;
}
function toggleKeyboardShortcuts() {
    if (keyboardShortcutsVisible) {
        hideKeyboardShortcuts();
    }
    else {
        showKeyboardShortcuts();
    }
}
function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.background = '#e8f5e8';
    errorMessage.style.borderColor = '#c3e6c3';
    errorMessage.style.color = '#2d5a2d';
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
        errorContainer.classList.add('hidden');
        errorMessage.style.background = '';
        errorMessage.style.borderColor = '';
        errorMessage.style.color = '';
    }, 3000);
}
function updateFrameStatesDisplay(frameStates) {
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
function initializeDOMElements() {
    console.log('🔧 INITIALIZING DOM ELEMENTS');
    captureBtn = document.getElementById('capture-btn');
    runTestBtn = document.getElementById('run-test-btn');
    frameList = document.getElementById('frame-list');
    frameCount = document.getElementById('frame-count');
    captureEmpty = document.getElementById('capture-empty');
    progressContainer = document.getElementById('progress-container');
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    errorContainer = document.getElementById('error-container');
    errorMessage = document.getElementById('error-message');
    resultsEmpty = document.getElementById('results-empty');
    resultsContent = document.getElementById('results-content');
    overallStatus = document.getElementById('overall-status');
    overallScore = document.getElementById('overall-score');
    settingsBtn = document.getElementById('settings-btn');
    historyBtn = document.getElementById('history-btn');
    exportBtn = document.getElementById('export-btn');
    settingsModal = document.getElementById('settings-modal');
    historyModal = document.getElementById('history-modal');
    exportModal = document.getElementById('export-modal');
    keyboardShortcuts = document.getElementById('keyboard-shortcuts');
    enhancedProgressContainer = document.getElementById('enhanced-progress-container');
    enhancedProgressFill = document.getElementById('enhanced-progress-fill');
    enhancedProgressText = document.getElementById('enhanced-progress-text');
    currentStepEl = document.getElementById('current-step');
    progressETA = document.getElementById('progress-eta');
    console.log('📋 DOM Elements Status:', {
        captureBtn: !!captureBtn,
        runTestBtn: !!runTestBtn,
        frameList: !!frameList,
        settingsBtn: !!settingsBtn,
        historyBtn: !!historyBtn,
        exportBtn: !!exportBtn
    });
}
function setupButtonHandlers() {
    console.log('🎯 SETTING UP BUTTON HANDLERS');
    if (captureBtn) {
        console.log('✅ Setting up capture button handler');
        captureBtn.onclick = handleCaptureClick;
        try {
            captureBtn.addEventListener('click', handleCaptureClick);
        }
        catch (e) {
            console.log('⚠️ addEventListener failed for capture button, using onclick only');
        }
    }
    else {
        console.log('❌ Capture button not found!');
    }
    if (runTestBtn) {
        console.log('✅ Setting up run test button handler');
        runTestBtn.onclick = handleRunTestClick;
        try {
            runTestBtn.addEventListener('click', handleRunTestClick);
        }
        catch (e) {
            console.log('⚠️ addEventListener failed for run test button, using onclick only');
        }
    }
    else {
        console.log('❌ Run test button not found!');
    }
    if (settingsBtn) {
        settingsBtn.onclick = handleSettingsClick;
    }
    if (historyBtn) {
        historyBtn.onclick = handleHistoryClick;
    }
    if (exportBtn) {
        exportBtn.onclick = handleExportClick;
    }
    const saveSettingsEl = document.getElementById('save-settings-btn');
    if (saveSettingsEl) {
        saveSettingsEl.onclick = handleSaveSettingsClick;
    }
    const testConnectionEl = document.getElementById('test-connection-btn');
    if (testConnectionEl) {
        testConnectionEl.onclick = handleTestConnectionClick;
    }
    const confirmExportEl = document.getElementById('confirm-export-btn');
    if (confirmExportEl) {
        confirmExportEl.onclick = handleConfirmExportClick;
    }
    const cancelExportEl = document.getElementById('cancel-export-btn');
    if (cancelExportEl) {
        cancelExportEl.onclick = handleCancelExportClick;
    }
    const exportHtmlEl = document.getElementById('export-html-btn');
    if (exportHtmlEl) {
        exportHtmlEl.onclick = handleExportHtmlClick;
    }
    const exportPdfEl = document.getElementById('export-pdf-btn');
    if (exportPdfEl) {
        exportPdfEl.onclick = handleExportPdfClick;
    }
    const closeSettingsEl = document.getElementById('close-settings');
    if (closeSettingsEl) {
        closeSettingsEl.onclick = function () {
            console.log('❌ Close settings clicked');
            closeModal('settings-modal');
        };
    }
    const closeHistoryEl = document.getElementById('close-history');
    if (closeHistoryEl) {
        closeHistoryEl.onclick = function () {
            console.log('❌ Close history clicked');
            closeModal('history-modal');
        };
    }
    const closeExportEl = document.getElementById('close-export');
    if (closeExportEl) {
        closeExportEl.onclick = function () {
            console.log('❌ Close export clicked');
            closeModal('export-modal');
        };
    }
    console.log('✅ Button handlers setup complete');
}
function initializeUI() {
    var _a;
    console.log('🚀 INITIALIZING UI');
    console.log('🔍 Verifying message handler during UI init:', {
        windowOnmessage: typeof window.onmessage,
        handlerExists: window.onmessage !== null,
        handlerName: ((_a = window.onmessage) === null || _a === void 0 ? void 0 : _a.name) || 'anonymous'
    });
    initializeDOMElements();
    setupButtonHandlers();
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
    const resultsSection = document.getElementById('results-section');
    if (resultsSection)
        resultsSection.classList.add('hidden');
    if (resultsContent)
        resultsContent.classList.add('hidden');
    if (resultsEmpty)
        resultsEmpty.classList.remove('hidden');
    if (overallStatus)
        overallStatus.classList.add('hidden');
    if (exportBtn)
        exportBtn.style.display = 'none';
    if (progressContainer)
        progressContainer.classList.add('hidden');
    if (enhancedProgressContainer)
        enhancedProgressContainer.classList.add('hidden');
    if (errorContainer)
        errorContainer.classList.add('hidden');
    if (frameList)
        frameList.classList.add('hidden');
    if (captureEmpty)
        captureEmpty.classList.remove('hidden');
    if (frameCount)
        frameCount.textContent = '0 frames';
    capturedFrames = [];
    currentResults = null;
    userTypes.forEach(userType => {
        const checkbox = document.getElementById(userType.id);
        if (checkbox) {
            checkbox.onchange = function () {
                console.log(`☑️ Checkbox ${userType.id} changed to:`, checkbox.checked);
                updateRunTestButton();
            };
        }
    });
    initializeEnhancedFeatures();
    loadSettings();
    updateRunTestButton();
    console.log('📤 Sending ui-ready message to plugin');
    try {
        parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
        console.log('✅ ui-ready message sent');
    }
    catch (error) {
        console.error('💥 Failed to send ui-ready message:', error);
    }
    console.log('📤 Requesting current selection state');
    try {
        parent.postMessage({ pluginMessage: { type: 'get-selection-state' } }, '*');
        console.log('✅ get-selection-state message sent');
    }
    catch (error) {
        console.error('💥 Failed to send get-selection-state message:', error);
    }
    console.log('✅ UI initialization complete');
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
console.log('🎬 STARTING PLUGIN INITIALIZATION');
console.log('📄 Document ready state:', document.readyState);
console.log('💬 SETTING UP MESSAGE HANDLER IMMEDIATELY (before DOM ready)');
setupMessageListener();
setTimeout(() => {
    var _a;
    console.log('🔍 IMMEDIATE HANDLER VERIFICATION (1 second later):');
    console.log('  window.onmessage type:', typeof window.onmessage);
    console.log('  window.onmessage exists:', window.onmessage !== null);
    console.log('  window.onmessage function:', ((_a = window.onmessage) === null || _a === void 0 ? void 0 : _a.name) || 'anonymous');
}, 1000);
window.testMessageHandler = function () {
    var _a;
    console.log('🧪 TESTING MESSAGE HANDLER:');
    console.log('  window.onmessage:', window.onmessage);
    console.log('  Type:', typeof window.onmessage);
    console.log('  Function name:', (_a = window.onmessage) === null || _a === void 0 ? void 0 : _a.name);
    console.log('  Exists:', window.onmessage !== null && window.onmessage !== undefined);
    const testEvent = {
        data: { pluginMessage: { type: 'test', message: 'Handler test' } },
        origin: 'test'
    };
    try {
        if (window.onmessage) {
            console.log('🔥 Calling window.onmessage with test event...');
            window.onmessage(testEvent);
            console.log('✅ Handler executed successfully');
        }
        else {
            console.log('❌ window.onmessage is null or undefined');
        }
    }
    catch (error) {
        console.error('💥 Error calling handler:', error);
    }
};
document.addEventListener('DOMContentLoaded', function () {
    console.log('📋 DOMContentLoaded event fired');
    initializeUI();
});
if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded');
}
else {
    console.log('⚡ Document already loaded, initializing immediately');
    setTimeout(initializeUI, 10);
}
window.addEventListener('load', function () {
    console.log('🏁 Window load event fired');
    if (!captureBtn) {
        console.log('🔧 Fallback initialization from window load');
        initializeUI();
    }
});
document.addEventListener('keydown', function (e) {
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
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
    }
});
