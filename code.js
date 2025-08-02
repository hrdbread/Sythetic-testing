const PLUGIN_DATA_KEYS = {
    FRAME_STATE: 'synthetic-testing-state',
    TEST_RESULTS: 'synthetic-testing-results',
    TEST_HISTORY: 'synthetic-testing-history',
    PLUGIN_VERSION: 'synthetic-testing-version'
};
figma.showUI(__html__, { width: 320, height: 500 });
initializePlugin();
figma.on('selectionchange', () => {
    handleSelectionChange();
});
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
        console.log('📤 Sending empty selection message to UI:', emptySelectionMessage);
        figma.ui.postMessage(emptySelectionMessage);
        console.log('✅ Empty selection message sent');
        return;
    }
    const validFrames = selection.filter(node => node.type === 'FRAME' ||
        node.type === 'COMPONENT' ||
        node.type === 'INSTANCE');
    const invalidNodes = selection.filter(node => node.type !== 'FRAME' &&
        node.type !== 'COMPONENT' &&
        node.type !== 'INSTANCE');
    let message = '';
    if (validFrames.length === 0) {
        const types = [...new Set(selection.map(n => n.type))].join(', ');
        message = `Selected items (${types}) are not frames or components. Please select frames, components, or instances.`;
    }
    else if (invalidNodes.length > 0) {
        message = `${validFrames.length} valid frame${validFrames.length === 1 ? '' : 's'} selected. ${invalidNodes.length} other item${invalidNodes.length === 1 ? '' : 's'} will be ignored.`;
    }
    else {
        message = `${validFrames.length} frame${validFrames.length === 1 ? '' : 's'} selected and ready to capture.`;
    }
    console.log('Selection feedback:', message);
    const selectionData = {
        count: selection.length,
        validFrames: validFrames.length,
        message: message,
        frameNames: validFrames.map(f => f.name)
    };
    console.log('📤 Sending selection update to UI:', selectionData);
    const messageToSend = {
        type: 'selection-update',
        data: selectionData
    };
    console.log('🔍 Message structure being sent:', messageToSend);
    console.log('🎯 Using figma.ui.postMessage() - Figma will deliver as event.data');
    figma.ui.postMessage(messageToSend);
    console.log('✅ Selection update message sent to UI with figma.ui.postMessage');
}
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
                handleSelectionChange();
                break;
            case 'ui-ready':
                console.log('✅ UI is ready, sending initial selection state');
                handleSelectionChange();
                break;
            case 'cancel':
                figma.closePlugin();
                break;
            default:
                console.warn('Unknown message type:', msg.type);
        }
    }
    catch (error) {
        console.error('Error handling message:', error);
        figma.ui.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
async function captureSelectedFrames() {
    try {
        const selection = figma.currentPage.selection;
        console.log('=== SELECTION DEBUG ===');
        console.log('Total selected items:', selection.length);
        console.log('Selected items:', selection.map(node => ({
            name: node.name,
            type: node.type,
            id: node.id
        })));
        if (selection.length === 0) {
            console.log('ERROR: No items selected');
            figma.ui.postMessage({
                type: 'error',
                message: 'Please select frames or components in Figma first.\n\nHow to select:\n1. Click on frames in your design\n2. Hold Shift to select multiple frames\n3. Components and instances are also supported'
            });
            return;
        }
        const validNodes = selection.filter(node => node.type === 'FRAME' ||
            node.type === 'COMPONENT' ||
            node.type === 'INSTANCE');
        console.log('Valid frame-like nodes:', validNodes.length);
        console.log('Valid nodes:', validNodes.map(node => ({
            name: node.name,
            type: node.type
        })));
        if (validNodes.length === 0) {
            const selectedTypes = [...new Set(selection.map(node => node.type))].join(', ');
            console.log('ERROR: No valid frames found. Selected types:', selectedTypes);
            figma.ui.postMessage({
                type: 'error',
                message: `Selected items are not frames or components.\n\nSelected: ${selectedTypes}\n\nPlease select:\n• Frames\n• Components\n• Component instances\n\nTip: Look for rectangular containers in your design.`
            });
            return;
        }
        const frameData = [];
        let processedCount = 0;
        let errorCount = 0;
        for (const node of validNodes) {
            try {
                console.log(`Processing node: ${node.name} (${node.type})`);
                let frameNode;
                if (node.type === 'FRAME') {
                    frameNode = node;
                }
                else if (node.type === 'COMPONENT') {
                    frameNode = node;
                }
                else if (node.type === 'INSTANCE') {
                    frameNode = node;
                }
                else {
                    console.log(`Skipping unsupported node type`);
                    continue;
                }
                await initializeFrameState(frameNode);
                await updateFrameState(frameNode.id, 'testing');
                console.log(`Capturing image for: ${frameNode.name}`);
                const imageData = await captureFrameAsJPEG(frameNode);
                console.log(`Image captured successfully for: ${frameNode.name} (${imageData.length} chars)`);
                const metadata = extractFrameMetadata(frameNode);
                console.log(`Metadata extracted for ${frameNode.name}:`, metadata);
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
            }
            catch (nodeError) {
                errorCount++;
                console.error(`Error processing node ${node.name}:`, nodeError);
            }
        }
        console.log(`Processing complete: ${processedCount} successful, ${errorCount} errors`);
        if (frameData.length === 0) {
            figma.ui.postMessage({
                type: 'error',
                message: `Failed to capture any frames.\n\nProcessed: ${processedCount} items\nErrors: ${errorCount} items\n\nTry selecting simpler frames or check the console for details.`
            });
            return;
        }
        console.log('📤 Sending frame data to UI:', frameData.length, 'frames');
        const framesCapturedMessage = {
            type: 'frames-captured',
            data: frameData
        };
        console.log('🔍 Sending frames-captured message:', {
            type: framesCapturedMessage.type,
            dataLength: frameData.length,
            frameNames: frameData.map(f => f.name)
        });
        figma.ui.postMessage(framesCapturedMessage);
        const successMessage = {
            type: 'success',
            message: `Successfully captured ${frameData.length} frame${frameData.length === 1 ? '' : 's'}!`
        };
        console.log('🔍 Sending success message:', successMessage);
        figma.ui.postMessage(successMessage);
        console.log('✅ Both messages sent to UI via figma.ui.postMessage');
    }
    catch (error) {
        console.error('Error capturing frames:', error);
        figma.ui.postMessage({
            type: 'error',
            message: `Failed to capture frames: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the console for more details.`
        });
    }
}
function validateImageSize(dataUrl, maxLength = 400000) {
    if (dataUrl.length <= maxLength) {
        return { isValid: true };
    }
    return {
        isValid: false,
        warning: `Image too large: ${dataUrl.length} characters (max: ${maxLength}). Consider reducing frame size or complexity.`
    };
}
async function captureWithReducedQuality(frame, quality = 0.5) {
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
    }
    catch (error) {
        console.error('Reduced quality export failed:', error);
        throw error;
    }
}
async function captureFrameAsJPEG(frame) {
    try {
        console.log(`Exporting ${frame.type}: ${frame.name} (${frame.width}x${frame.height})`);
        const estimatedPixels = frame.width * frame.height;
        const estimatedSizeKB = estimatedPixels * 3 / 1024;
        console.log(`Estimated image size: ${Math.round(estimatedSizeKB)} KB`);
        if (estimatedSizeKB > 2048) {
            console.warn(`Large image detected (${Math.round(estimatedSizeKB)} KB estimated). Consider reducing frame size.`);
        }
        const imageBytes = await frame.exportAsync({
            format: 'JPG',
            constraint: { type: 'SCALE', value: 1 }
        });
        console.log(`Image export complete: ${imageBytes.length} bytes (${Math.round(imageBytes.length / 1024)} KB)`);
        if (imageBytes.length > 3 * 1024 * 1024) {
            throw new Error(`Image too large: ${Math.round(imageBytes.length / 1024 / 1024)} MB. Please reduce frame size or complexity.`);
        }
        const base64 = figma.base64Encode(imageBytes);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        console.log(`Base64 conversion complete: ${dataUrl.length} characters`);
        const validation = validateImageSize(dataUrl, 400000);
        if (!validation.isValid) {
            console.warn(validation.warning);
            try {
                console.log('Attempting capture with reduced quality...');
                const reducedQualityImage = await captureWithReducedQuality(frame, 0.4);
                const revalidation = validateImageSize(reducedQualityImage, 400000);
                if (revalidation.isValid) {
                    console.log('Reduced quality image meets size requirements');
                    return reducedQualityImage;
                }
                else {
                    console.warn('Even reduced quality image is too large, using original');
                }
            }
            catch (fallbackError) {
                console.warn('Fallback capture failed, using original image:', fallbackError);
            }
        }
        return dataUrl;
    }
    catch (error) {
        console.error('Error capturing frame as JPEG:', error);
        throw new Error(`Failed to capture ${frame.type.toLowerCase()} "${frame.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function extractFrameMetadata(frame) {
    const metadata = {
        hasText: false,
        hasButtons: false,
        hasImages: false,
        textCount: 0,
        buttonCount: 0,
        imageCount: 0,
        components: []
    };
    try {
        function analyzeNode(node) {
            switch (node.type) {
                case 'TEXT':
                    metadata.hasText = true;
                    metadata.textCount++;
                    metadata.components.push('text');
                    break;
                case 'RECTANGLE':
                case 'ELLIPSE':
                case 'POLYGON':
                    const hasClick = 'reactions' in node && node.reactions && node.reactions.length > 0;
                    if (hasClick) {
                        metadata.hasButtons = true;
                        metadata.buttonCount++;
                        metadata.components.push('button');
                    }
                    break;
                default:
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
                    const name = node.name.toLowerCase();
                    if (name.includes('button') || name.includes('btn')) {
                        metadata.hasButtons = true;
                        metadata.buttonCount++;
                        metadata.components.push('button');
                    }
                    break;
            }
            if ('children' in node && node.children) {
                node.children.forEach(analyzeNode);
            }
        }
        frame.children.forEach(analyzeNode);
    }
    catch (error) {
        console.error('Error extracting metadata:', error);
    }
    return metadata;
}
function testMessageSending() {
    console.log('🧪 TESTING MESSAGE SENDING FROM MAIN THREAD');
    const testMessage = {
        type: 'test',
        message: 'Test message from main thread'
    };
    console.log('📤 Sending test message:', testMessage);
    figma.ui.postMessage(testMessage);
    console.log('✅ Test message sent via figma.ui.postMessage');
}
async function initializePlugin() {
    console.log('Synthetic User Testing plugin loaded');
    await migratePluginData();
    await updateAllFrameIndicators();
    setTimeout(() => {
        console.log('🔍 Testing message sending capability...');
        testMessageSending();
    }, 2000);
}
async function initializeFrameState(frame) {
    const existingState = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE);
    if (!existingState) {
        await updateFrameState(frame.id, 'ready');
    }
}
async function updateFrameState(frameId, state) {
    try {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== 'FRAME') {
            throw new Error('Frame not found');
        }
        frame.setPluginData(PLUGIN_DATA_KEYS.FRAME_STATE, state);
        await updateFrameIndicator(frame, state);
        figma.ui.postMessage({
            type: 'frame-state-updated',
            data: { frameId, state }
        });
        console.log(`Frame ${frame.name} state updated to: ${state}`);
    }
    catch (error) {
        console.error('Error updating frame state:', error);
        throw error;
    }
}
async function updateFrameIndicator(frame, state) {
    try {
        const existingIndicator = frame.children.find(child => child.name === 'Synthetic Testing Status');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        const indicator = figma.createEllipse();
        indicator.name = 'Synthetic Testing Status';
        indicator.resize(12, 12);
        indicator.x = frame.width - 20;
        indicator.y = 8;
        const colors = {
            'ready': { r: 0.8, g: 0.8, b: 0.8 },
            'testing': { r: 1, g: 0.8, b: 0.2 },
            'tested': { r: 0.2, g: 0.8, b: 0.3 },
            'fixed': { r: 0.2, g: 0.6, b: 1 }
        };
        indicator.fills = [{
                type: 'SOLID',
                color: colors[state]
            }];
        indicator.strokes = [{
                type: 'SOLID',
                color: { r: 1, g: 1, b: 1 }
            }];
        indicator.strokeWeight = 1;
        frame.appendChild(indicator);
    }
    catch (error) {
        console.error('Error updating frame indicator:', error);
    }
}
async function saveTestResults(data) {
    try {
        const { frameId, results } = data;
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== 'FRAME') {
            throw new Error('Frame not found');
        }
        const testResult = {
            id: generateId(),
            timestamp: new Date(),
            overallScore: results.overallScore,
            categoryScores: results.categoryScores,
            issues: results.issues || [],
            personas: results.personas || []
        };
        let testData = await getFrameTestData(frameId);
        if (!testData) {
            testData = {
                frameId,
                frameName: frame.name,
                state: 'tested',
                history: []
            };
        }
        testData.lastTested = testResult.timestamp;
        testData.currentResult = testResult;
        testData.history.unshift(testResult);
        testData.history = testData.history.slice(0, 10);
        testData.state = 'tested';
        frame.setPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS, JSON.stringify(testData));
        await updateFrameState(frameId, 'tested');
        figma.ui.postMessage({
            type: 'test-results-saved',
            data: { frameId, success: true }
        });
    }
    catch (error) {
        console.error('Error saving test results:', error);
        figma.ui.postMessage({
            type: 'error',
            message: `Failed to save test results: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
async function getFrameTestData(frameId) {
    try {
        const frame = figma.getNodeById(frameId);
        if (!frame || frame.type !== 'FRAME') {
            return null;
        }
        const testDataStr = frame.getPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS);
        const state = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE) || 'ready';
        if (testDataStr) {
            const testData = JSON.parse(testDataStr);
            testData.state = state;
            return testData;
        }
        return {
            frameId,
            frameName: frame.name,
            state,
            history: []
        };
    }
    catch (error) {
        console.error('Error getting frame test data:', error);
        return null;
    }
}
async function sendFrameStates() {
    try {
        const frames = figma.currentPage.findAll(node => node.type === 'FRAME');
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
        figma.ui.postMessage({
            type: 'frame-states',
            data: frameStates
        });
    }
    catch (error) {
        console.error('Error sending frame states:', error);
    }
}
async function sendTestHistory(frameId) {
    try {
        const testData = await getFrameTestData(frameId);
        figma.ui.postMessage({
            type: 'test-history',
            data: {
                frameId,
                history: testData && testData.history || [],
                currentResult: testData && testData.currentResult
            }
        });
    }
    catch (error) {
        console.error('Error sending test history:', error);
    }
}
async function clearFrameData(frameId) {
    try {
        const frame = figma.getNodeById(frameId);
        if (frame && frame.type === 'FRAME') {
            frame.setPluginData(PLUGIN_DATA_KEYS.TEST_RESULTS, '');
            frame.setPluginData(PLUGIN_DATA_KEYS.FRAME_STATE, '');
            const indicator = frame.children.find(child => child.name === 'Synthetic Testing Status');
            if (indicator) {
                indicator.remove();
            }
            await updateFrameState(frameId, 'ready');
        }
        figma.ui.postMessage({
            type: 'frame-data-cleared',
            data: { frameId, success: true }
        });
    }
    catch (error) {
        console.error('Error clearing frame data:', error);
        figma.ui.postMessage({
            type: 'error',
            message: `Failed to clear frame data: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
async function updateAllFrameIndicators() {
    try {
        const frames = figma.currentPage.findAll(node => node.type === 'FRAME');
        for (const frame of frames) {
            const state = frame.getPluginData(PLUGIN_DATA_KEYS.FRAME_STATE);
            if (state) {
                await updateFrameIndicator(frame, state);
            }
        }
    }
    catch (error) {
        console.error('Error updating frame indicators:', error);
    }
}
async function migratePluginData() {
    try {
        const currentVersion = '1.0.0';
        const storedVersion = figma.root.getPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION);
        if (!storedVersion) {
            figma.root.setPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION, currentVersion);
            console.log('Plugin data initialized');
        }
        else if (storedVersion !== currentVersion) {
            figma.root.setPluginData(PLUGIN_DATA_KEYS.PLUGIN_VERSION, currentVersion);
            console.log(`Plugin data migrated from ${storedVersion} to ${currentVersion}`);
        }
    }
    catch (error) {
        console.error('Error migrating plugin data:', error);
    }
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
console.log('Synthetic User Testing plugin loaded');
