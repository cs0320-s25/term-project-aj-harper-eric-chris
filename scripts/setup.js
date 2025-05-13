#!/usr/bin/env node

/**
 * MimicCaptcha Setup Script
 *
 * This executable script is installed along with the mimicaptcha package.
 * App developers can run it with: npm run mimic-setup
 *
 * It automatically:
 * 1. Creates the public/models directory if it doesn't exist
 * 2. Copies the face detection models from the package to the app's public directory
 * 3. No need for the app developer to create their own setup script
 */

// Use ESM imports since our package.json has "type": "module"
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the current working directory where the script is run from
const APP_DIR = process.cwd();
const MODELS_DEST_DIR = path.join(APP_DIR, "public", "models");

// Find the path to the mimicaptcha package in node_modules
const findMimicaptchaPath = () => {
  try {
    // Try standard path first
    const standardPath = path.join(APP_DIR, "node_modules", "mimicaptcha");
    if (fs.existsSync(standardPath)) {
      return standardPath;
    }

    // If not found in standard path, search node_modules recursively
    // This handles cases where mimicaptcha might be installed as a dependency of another package
    console.log("Searching for mimicaptcha package...");
    const searchForPackage = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          if (item === "mimicaptcha") {
            return itemPath;
          }

          // Don't go into node_modules directories to avoid infinite recursion
          if (item !== "node_modules") {
            const found = searchForPackage(itemPath);
            if (found) return found;
          }
        }
      }
      return null;
    };

    const result = searchForPackage(path.join(APP_DIR, "node_modules"));
    if (result) return result;

    throw new Error("mimicaptcha package not found in node_modules");
  } catch (error) {
    console.error("Error finding mimicaptcha package:", error.message);
    process.exit(1);
  }
};

const MIMICAPTCHA_PATH = findMimicaptchaPath();
const MIMICAPTCHA_MODELS_SOURCE = path.join(MIMICAPTCHA_PATH, "dist", "models");

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
  console.log("\n🚀 Setting up MimicCaptcha models...\n");

  try {
    // Step 1: Check if models source directory exists in the installed package
    if (!fs.existsSync(MIMICAPTCHA_MODELS_SOURCE)) {
      console.error(
        `\n❌ Error: Models not found in the mimicaptcha package at ${MIMICAPTCHA_MODELS_SOURCE}`
      );
      console.error(
        "Make sure you have installed the mimicaptcha package correctly."
      );
      process.exit(1);
    }

    // Step 2: Copy models from the package to public/models
    console.log(
      `Copying models from ${MIMICAPTCHA_MODELS_SOURCE} to ${MODELS_DEST_DIR}...`
    );
    copyDirectory(MIMICAPTCHA_MODELS_SOURCE, MODELS_DEST_DIR);

    console.log("\n✅ Setup completed successfully!");
    console.log("\nYou can now use MimicCaptcha in your application.");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

// Run the setup
setup();
