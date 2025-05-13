"use client";

import React from "react";
import { MimicCaptcha } from "../components/MimicCaptcha";

/**
 * Test page for the standalone MimicCaptcha component
 */
export default function TestPage() {
  const handleCaptchaSuccess = () => {
    console.log("CAPTCHA verified successfully!");
    alert("CAPTCHA verified successfully!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-primary-600 dark:text-primary-400">
          MimicCaptcha Test Page
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-md">
          Testing the standalone component
        </p>
      </header>

      <main className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Sample Form</h2>

          <form className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="pt-2">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verify you're human
              </p>
              <MimicCaptcha
                onSuccess={handleCaptchaSuccess}
                showTypeSwitcher={true}
                defaultType="audio"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-md transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} MimicCaptcha</p>
      </footer>
    </div>
  );
}
