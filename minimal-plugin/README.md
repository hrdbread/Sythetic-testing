# Minimal Frame Counter Plugin

A minimal Figma plugin to test frame capture and message passing.

## Files Structure
```
minimal-plugin/
├── manifest.json  # Plugin configuration
├── code.js        # Main thread (Figma sandbox)
├── ui.html        # UI layout
├── ui.js          # UI logic
└── README.md      # This file
```

## Features
- ✅ Count total frames on current page
- ✅ Track selected frames in real-time
- ✅ Capture basic frame information
- ✅ Simple message passing between main thread and UI
- ✅ Debug logging and message counter

## How to Install
1. Open Figma Desktop App
2. Go to Plugins → Development → Import plugin from manifest
3. Select the `manifest.json` file in this folder
4. Plugin will appear as "Minimal Frame Counter"

## How to Use
1. Open the plugin from Plugins menu
2. **Refresh Count**: Updates total frame count on page
3. **Capture Selected**: Captures info from selected frames
4. **Close Plugin**: Closes the plugin

## Message Flow
```
Main Thread (code.js) ←→ UI Thread (ui.html + ui.js)

Main → UI:
- frame-count: Total frames on page
- selection-changed: Selected frames count
- capture-result: Results of frame capture

UI → Main:
- get-frame-count: Request frame count
- capture-frames: Request frame capture
- close-plugin: Close the plugin
```

## Debug Features
- Console logging in both threads
- Message counter in UI
- Last message type display
- Success/error message display

## Testing Message Passing
1. Open browser console (F12) while plugin is open
2. Look for log messages with emojis (🚀📨✅❌)
3. Use `testMessageHandler()` in console to test UI message handling
4. Select/deselect frames to see real-time updates

## Next Steps
Once message passing is working perfectly:
1. Add image capture functionality
2. Add Claude API integration
3. Add more sophisticated UI
4. Add TypeScript if needed

## Troubleshooting
- **No messages received**: Check console for errors
- **Button not working**: Verify event handlers are attached
- **Plugin won't load**: Check manifest.json syntax
- **UI not updating**: Check message handler in ui.js