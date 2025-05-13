/**
 * Post-Installation Script
 *
 * This script runs after the package is installed and ensures the face detection models
 * are correctly placed in the user's project. It checks if the models are needed and
 * offers guidance on where to place them.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Detect if we're in a development environment or being installed as a dependency
const isDevEnvironment =
  !process.env.npm_config_global &&
  process.env.npm_lifecycle_event === "postinstall" &&
  process.env.INIT_CWD === process.cwd();

// Skip the script if we're in a development environment
if (isDevEnvironment) {
  console.log("Development environment detected - skipping postinstall setup.");
  process.exit(0);
}

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Copy the models to a specified destination
 */
function copyModels(destination) {
  try {
    // Get the source models path (from the package)
    const packageDir = path.resolve(__dirname, "..");
    const sourceModelsDir = path.join(packageDir, "dist", "models");

    if (!fs.existsSync(sourceModelsDir)) {
      console.error("Error: Model files not found in the package.");
      return false;
    }

    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    // Copy all model files
    copyDirectory(sourceModelsDir, destination);
    return true;
  } catch (error) {
    console.error("Error copying models:", error);
    return false;
  }
}

/**
 * Recursively copy a directory
 */
function copyDirectory(source, destination) {
  // Get all files in the source directory
  const files = fs.readdirSync(source);

  // Process each file
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    // Check if it's a directory or file
    if (fs.statSync(sourcePath).isDirectory()) {
      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      // Recursively copy subdirectory
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

/**
 * Main installation process
 */
function startInstallation() {
  console.log("\n🤖 MimicCaptcha - Post-installation Setup 🤖\n");
  console.log(
    "The facial recognition captcha requires model files to work properly."
  );

  rl.question(
    "Would you like to copy the face detection models? (Y/n): ",
    (answer) => {
      if (answer.toLowerCase() !== "n") {
        rl.question(
          "Where would you like to place the models? (default: ./public/models): ",
          (destination) => {
            const modelsDestination = destination || "./public/models";

            console.log(`\nCopying models to ${modelsDestination}...`);
            const success = copyModels(modelsDestination);

            if (success) {
              console.log("\n✅ Models successfully copied!");
              console.log(
                "\nTo use the facial captcha, make sure your application can access these model files."
              );
              console.log(
                "If you're using a framework like Next.js or Create React App, these files should be accessible from your public directory."
              );
            } else {
              console.log("\n❌ Failed to copy models.");
              console.log(
                "You'll need to manually copy the models from node_modules/mimicaptcha/dist/models to your public directory."
              );
            }

            rl.close();
          }
        );
      } else {
        console.log("\nSkipping model installation.");
        console.log(
          "Note: The facial captcha won't work without the model files."
        );
        console.log(
          "You can manually copy them from node_modules/mimicaptcha/dist/models to your public directory later."
        );
        rl.close();
      }
    }
  );
}

// Start the installation process
startInstallation();
