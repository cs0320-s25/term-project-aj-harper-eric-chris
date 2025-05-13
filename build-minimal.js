#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Create dist directory if it doesn't exist
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// Create specialized tsconfig for minimal build
const minimalTsConfig = {
  compilerOptions: {
    target: "es6",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    noEmit: false,
    outDir: "dist",
    declaration: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "react",
    jsxFactory: "React.createElement",
    jsxFragmentFactory: "React.Fragment",
    incremental: true,
  },
  include: [
    // Core components
    "src/lib/mimicaptcha/**/*.ts",
    "src/lib/mimicaptcha/**/*.tsx",
    "src/components/facial-captcha/**/*.tsx",
    "src/components/audio-captcha/**/*.tsx",
    "src/lib/toneDetector.ts",

    // UI components and utilities
    "src/components/ui/**/*.tsx",
    "src/components/client-only.tsx",

    // Main export
    "src/index.tsx",
  ],
  exclude: ["node_modules", "**/*.test.ts", "**/*.test.tsx"],
};

// Write the minimal tsconfig
fs.writeFileSync(
  "tsconfig.minimal.json",
  JSON.stringify(minimalTsConfig, null, 2)
);

// Ensure the components directories exist
const dirs = [
  "dist/lib/mimicaptcha",
  "dist/components/facial-captcha",
  "dist/components/audio-captcha",
  "dist/components/ui",
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Run TypeScript compiler with minimal config
console.log("Building TypeScript code with minimal configuration...");
try {
  execSync("npx tsc -p tsconfig.minimal.json", { stdio: "inherit" });
  console.log("TypeScript compilation successful");
} catch (error) {
  console.error("Error during TypeScript compilation:", error);
  process.exit(1);
}

// Copy all CSS files
console.log("Copying CSS files...");

// Function to recursively find all CSS files in a directory
function findCssFiles(startPath) {
  let results = [];
  if (!fs.existsSync(startPath)) {
    return results;
  }

  const files = fs.readdirSync(startPath);
  for (let file of files) {
    const filePath = path.join(startPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search directories
      results = results.concat(findCssFiles(filePath));
    } else if (file.endsWith(".css")) {
      results.push(filePath);
    }
  }

  return results;
}

// Find all CSS files in the src directory
const cssFiles = findCssFiles(path.join(__dirname, "src"));

// Copy each CSS file to the corresponding dist location
cssFiles.forEach((cssFile) => {
  // Calculate the relative path from src
  const relativePath = path.relative(path.join(__dirname, "src"), cssFile);
  const destPath = path.join(__dirname, "dist", relativePath);

  // Ensure the destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy the CSS file
  fs.copyFileSync(cssFile, destPath);
  console.log(`Copied ${cssFile} to ${destPath}`);
});

// Create a models directory and add a README
const modelsDestDir = "dist/models";
if (!fs.existsSync(modelsDestDir)) {
  fs.mkdirSync(modelsDestDir, { recursive: true });
}

const modelsReadme = `# Face API Models

This directory should contain the face-api.js models needed for facial recognition.
These models are required for the facial captcha component to work correctly.

## Required Models

The following models are required:
- face_landmark_68_tiny_model-weights_manifest.json
- face_landmark_68_tiny_model-shard1
- face_expression_model-weights_manifest.json
- face_expression_model-shard1
- tiny_face_detector_model-weights_manifest.json
- tiny_face_detector_model-shard1

You can obtain these models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
`;

fs.writeFileSync(path.join(modelsDestDir, "README.md"), modelsReadme);
console.log("Created models README");

// Copy the models from public directory if they exist
const publicModelsDir = "public/models";
if (fs.existsSync(publicModelsDir)) {
  fs.readdirSync(publicModelsDir).forEach((file) => {
    const source = path.join(publicModelsDir, file);
    const dest = path.join(modelsDestDir, file);
    if (fs.statSync(source).isFile()) {
      fs.copyFileSync(source, dest);
      console.log(`Copied model file ${source} to ${dest}`);
    }
  });
}

// Create a postinstall script that helps users set up the component properly
const postinstallScript = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a message to help users set up the component
console.log('\\n\\x1b[32m✓\\x1b[0m MimiCaptcha has been installed successfully!');
console.log('\\n\\x1b[1mIMPORTANT:\\x1b[0m To use MimiCaptcha, you need to:');
console.log('\\n1. Copy the face-api.js models to your public directory:');
console.log('   mkdir -p public/models');
console.log('   cp node_modules/mimicaptcha/dist/models/* public/models/');
console.log('\\n2. If styling looks incorrect, make sure you\'re using the CSS from this package.');
console.log('   The component should work with Tailwind or any CSS-in-JS solution.');
console.log('\\nFor more details, see the README.md file in the mimicaptcha package.\\n');
`;

const postinstallPath = path.join(__dirname, "dist", "postinstall.js");
fs.writeFileSync(postinstallPath, postinstallScript);
fs.chmodSync(postinstallPath, "755");
console.log("Created postinstall script");

// Clean up
fs.unlinkSync("tsconfig.minimal.json");

console.log("Build completed successfully");
