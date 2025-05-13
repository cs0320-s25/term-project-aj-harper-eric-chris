/**
 * MimicCaptcha Sample App Setup Script
 *
 * This script automatically sets up the MimicCaptcha models in the sample app.
 * It runs as part of the 'npm run setup' command and:
 * 1. Creates public/models directory if it doesn't exist
 * 2. Copies model files from node_modules/mimicaptcha/dist/models to public/models
 * 3. Does this all automatically without requiring access to the main project directory
 */

const fs = require("fs");
const path = require("path");

// Define paths
const SAMPLE_APP_ROOT = path.resolve(__dirname, "..");
const MODELS_DEST_DIR = path.join(SAMPLE_APP_ROOT, "public", "models");
const MIMICAPTCHA_MODELS_SOURCE = path.join(
  SAMPLE_APP_ROOT,
  "node_modules",
  "mimicaptcha",
  "dist",
  "models"
);

/**
 * Recursively copy a directory
 */
function copyDirectory(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
    console.log(`Created directory: ${destination}`);
  }

  // Get all files in the source directory
  try {
    const files = fs.readdirSync(source);

    // Copy each file to the destination
    files.forEach((file) => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);

      // Check if it's a directory or file
      if (fs.statSync(sourcePath).isDirectory()) {
        // Recursively copy subdirectory
        copyDirectory(sourcePath, destPath);
      } else {
        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied: ${file}`);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${source}:`, error.message);
    throw error;
  }
}

/**
 * Main setup function
 */
function setup() {
  console.log("\n🚀 Setting up MimicCaptcha for the sample app...\n");

  try {
    // Step 1: Check if models source directory exists in the installed package
    if (!fs.existsSync(MIMICAPTCHA_MODELS_SOURCE)) {
      console.error(
        `\n❌ Error: Models not found in the mimicaptcha package at ${MIMICAPTCHA_MODELS_SOURCE}`
      );
      console.error(
        "Make sure you have installed the mimicaptcha package first."
      );
      console.error("Run: npm install");
      process.exit(1);
    }

    // Step 2: Create models destination directory if it doesn't exist
    if (!fs.existsSync(MODELS_DEST_DIR)) {
      fs.mkdirSync(MODELS_DEST_DIR, { recursive: true });
      console.log(`Created models directory: ${MODELS_DEST_DIR}`);
    }

    // Step 3: Copy models from the package to public/models
    console.log(
      `Copying models from ${MIMICAPTCHA_MODELS_SOURCE} to ${MODELS_DEST_DIR}...`
    );
    copyDirectory(MIMICAPTCHA_MODELS_SOURCE, MODELS_DEST_DIR);

    console.log("\n✅ Setup completed successfully!");
    console.log("\nYou can now run the sample app with:");
    console.log("npm run dev");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run the setup
setup();
