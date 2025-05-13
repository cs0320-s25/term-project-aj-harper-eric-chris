/**
 * Model Copy Utility Script
 *
 * This script copies the face-api.js models to the appropriate location
 * during the build process. This ensures that the models are included
 * with the package and will be available when installed by end users.
 */

const fs = require("fs");
const path = require("path");

/**
 * Copy models from source to destination.
 * @param {string} sourcePath - The source directory containing the models
 * @param {string} destPath - The destination directory for the models
 */
function copyModels(sourcePath, destPath) {
  console.log(`Copying models from ${sourcePath} to ${destPath}`);

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
    console.log(`Created directory: ${destPath}`);
  }

  // Get list of all files in the source directory
  const files = fs.readdirSync(sourcePath);

  // Copy each file to the destination
  files.forEach((file) => {
    const sourceFile = path.join(sourcePath, file);
    const destFile = path.join(destPath, file);

    // Get file stats to determine if it's a directory or file
    const stats = fs.statSync(sourceFile);

    if (stats.isDirectory()) {
      // Recursively copy subdirectories
      copyModels(sourceFile, destFile);
    } else {
      // Copy file
      fs.copyFileSync(sourceFile, destFile);
      console.log(`Copied: ${file}`);
    }
  });
}

// Main execution
try {
  // Define paths
  const rootDir = path.resolve(__dirname, "..");
  const sourceModelsDir = path.join(rootDir, "public", "models");
  const distModelsDir = path.join(rootDir, "dist", "models");

  // Execute the copy
  copyModels(sourceModelsDir, distModelsDir);
  console.log("Model copying completed successfully.");
} catch (error) {
  console.error("Error copying models:", error);
  process.exit(1);
}
