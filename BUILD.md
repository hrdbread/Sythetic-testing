# Figma Plugin Build Guide

## ✅ Build System Fixed

Your Figma plugin now has a proper build system that compiles TypeScript to ES2018-compatible JavaScript.

## 📁 Project Structure

```
figma-synthetic-testing/
├── manifest.json          # Plugin manifest
├── code.js                # Main plugin code (compiled)
├── ui.html                # Plugin UI
├── ui.js                  # UI logic (compiled)
├── claude-api.js          # Claude API client (compiled)
├── personas.js            # User personas (compiled)
├── report-generator.js    # Report generation (compiled)
├── package.json           # Build configuration
├── tsconfig.json          # TypeScript configuration
├── webpack.config.js      # Webpack configuration (backup)
└── BUILD.md               # This file
```

## 🛠️ Build Commands

### Main Commands
- `npm run build` - Verify all files are ready for Figma
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run clean` - Remove compiled JavaScript files

### Development Commands
- `npm run compile-code` - Compile only code.ts
- `npm run compile-ui` - Compile only ui.ts
- `npm run dev` - Watch mode compilation
- `npm run type-check` - Check types without compiling

### Alternative Build
- `npm run build-ignore-errors` - Build even with TypeScript errors
- `npm run webpack-build` - Use webpack (if needed)

## ⚙️ Configuration Details

### TypeScript Configuration
- **Target**: ES2018 (Figma compatible)
- **No optional chaining** (`?.`) - replaced with traditional null checks
- **No nullish coalescing** (`??`) - not used
- **Strict mode**: Disabled for flexibility
- **Skip lib check**: Enabled to avoid type conflicts

### Key Features Fixed
1. ✅ **ES2018 compatibility** - No modern syntax that breaks in Figma
2. ✅ **Optional chaining removed** - All `?.` converted to `&&` checks
3. ✅ **Type annotations stripped** - Clean JavaScript output
4. ✅ **Proper file extensions** - All outputs are `.js` files
5. ✅ **Figma plugin ready** - Compatible with Figma's JavaScript environment

## 🚀 Import to Figma

1. Run `npm run build` to verify files
2. In Figma: **Plugins** → **Development** → **Import plugin from manifest**
3. Select your `manifest.json` file
4. Plugin ready to use!

## 📝 Build Troubleshooting

### If TypeScript compilation fails:
```bash
npm run build-ignore-errors
```

### If you need to rebuild from TypeScript:
```bash
npm run clean
npm run compile
```

### If you get Figma API errors:
The compiled JavaScript files are designed to work without Figma type definitions during build time, but will have access to Figma APIs when loaded in the plugin environment.

## 🔧 Advanced Configuration

The build system includes:
- **Webpack config** - For advanced bundling (optional)
- **Multiple compile options** - Individual file compilation
- **Development watching** - Auto-recompile on changes
- **Error handling** - Build succeeds even with type warnings

Your plugin is now ready for production use in Figma!