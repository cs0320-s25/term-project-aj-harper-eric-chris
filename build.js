#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Create dist directory if it doesn't exist
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// Run TypeScript compiler
console.log("Building TypeScript code...");
try {
  // Important: React and ReactDOM are handled as external peer dependencies
  // This ensures they are not bundled with the library and are provided by the host application
  execSync("npx tsc", { stdio: "inherit" });
  console.log("TypeScript compilation successful");
} catch (error) {
  console.error("Error during TypeScript compilation:", error);
  process.exit(1);
}

// Copy CSS files
console.log("Copying CSS files...");
const cssSourceDir = "src/lib/mimicaptcha";
const cssDestDir = "dist/lib/mimicaptcha";

if (!fs.existsSync(cssDestDir)) {
  fs.mkdirSync(cssDestDir, { recursive: true });
}

fs.readdirSync(cssSourceDir).forEach((file) => {
  if (file.endsWith(".css")) {
    const source = path.join(cssSourceDir, file);
    const dest = path.join(cssDestDir, file);
    fs.copyFileSync(source, dest);
    console.log(`Copied ${source} to ${dest}`);
  }
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

console.log("Build completed successfully");
