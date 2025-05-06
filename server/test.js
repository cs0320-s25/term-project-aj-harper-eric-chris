/**
 * Simple test script for the Audio Captcha API
 *
 * Run with: node server/test.js
 */

const http = require("http");

// Configuration
const API_HOST = "localhost";
const API_PORT = 3001;
const API_BASE = "/api/audio-captcha";

// Helper function to make HTTP requests
const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `${API_BASE}${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log(`Response from ${method} ${path}:`);
          console.log(JSON.stringify(parsedData, null, 2));
          console.log("\n");
          resolve(parsedData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

// Test the API
const runTests = async () => {
  try {
    console.log("=== Testing Audio Captcha API ===\n");

    // 1. Generate a challenge
    console.log("1. Generating a new challenge...");
    const generateResponse = await makeRequest("GET", "/generate");
    const challengeId = generateResponse.challengeId;

    // 2. Get tone data
    console.log("2. Getting tone data...");
    const toneResponse = await makeRequest("GET", `/tone/${challengeId}`);
    const expectedFrequency = toneResponse.frequency;

    // 3. Test successful verification (exact match)
    console.log("3. Testing successful verification (exact match)...");
    const exactMatchResponse = await makeRequest("POST", "/verify", {
      challengeId,
      recordedFrequency: expectedFrequency,
    });

    // 4. Test successful verification (within tolerance)
    const withinTolerance = expectedFrequency * 1.1; // 10% higher
    console.log(
      `4. Testing successful verification (within tolerance: ${withinTolerance} Hz)...`
    );
    const toleranceMatchResponse = await makeRequest("POST", "/verify", {
      challengeId,
      recordedFrequency: withinTolerance,
    });

    // 5. Test failed verification (outside tolerance)
    const outsideTolerance = expectedFrequency * 1.2; // 20% higher, should be outside 15% tolerance
    console.log(
      `5. Testing failed verification (outside tolerance: ${outsideTolerance} Hz)...`
    );
    const failedVerificationResponse = await makeRequest("POST", "/verify", {
      challengeId,
      recordedFrequency: outsideTolerance,
    });

    console.log("=== All tests completed ===");
  } catch (error) {
    console.error("Test failed:", error.message);
  }
};

// Start the server if it's not already running
const startServerAndRunTests = () => {
  // Check if server is running
  const req = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: "/api/health",
      method: "GET",
    },
    (res) => {
      // Server is running, execute tests
      runTests();
    }
  );

  req.on("error", (e) => {
    console.log("Server not running. Please start the server with:");
    console.log("  npm run server");
    console.log("Then run the tests again.");
  });

  req.end();
};

startServerAndRunTests();
