# MimicCaptcha

A modern, accessible CAPTCHA alternative for React applications that uses mimicry-based human verification.

![MimicCaptcha](https://img.shields.io/badge/MimicCaptcha-v0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.x-61dafb)

## Features

- **Dual Verification Modes**: Audio tone mimicry and facial expression mimicry
- **Accessibility-First Design**: Built with WCAG guidelines in mind
- **Highly Customizable**: Configure difficulty, attempts, size, and more
- **Standalone**: No external API dependencies, works locally
- **Developer-Friendly**: Simple API with TypeScript support
- **Zero Next.js Dependencies**: Works with any React framework

## Installation

```bash
npm install mimicaptcha
```

After installation, the post-install script will prompt you to set up the face detection models:

```
🤖 MimicCaptcha - Post-installation Setup 🤖

The facial recognition captcha requires model files to work properly.
Would you like to copy the face detection models? (Y/n):
```

If you choose yes, the models will be copied to your project's public directory.

## Usage

### Basic Usage

```jsx
import React from "react";
import { MimicCaptcha } from "mimicaptcha";

function MyForm() {
  const handleSuccess = () => {
    console.log("Human verification successful!");
    // Allow form submission or other actions
  };

  return (
    <div className="form-container">
      <h2>Contact Form</h2>
      <form>
        {/* Your form fields */}

        <div className="captcha-container">
          <MimicCaptcha onSuccess={handleSuccess} />
        </div>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
```

### Advanced Configuration

```jsx
import React from "react";
import { MimicCaptcha } from "mimicaptcha";

function AdvancedForm() {
  const handleSuccess = () => {
    console.log("Verification successful!");
  };

  const handleFailure = () => {
    console.log("Maximum attempts reached");
  };

  return (
    <MimicCaptcha
      onSuccess={handleSuccess}
      onFailure={handleFailure}
      defaultType="facial"
      showTypeSwitcher={true}
      maxAttempts={5}
      difficulty="hard"
      size="large"
      darkMode={true}
      showSuccessMessage={true}
      successMessage="Great job, human!"
      successMessageDuration={2000}
    />
  );
}
```

## Configuration Options

| Prop                     | Type                              | Default                            | Description                                              |
| ------------------------ | --------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `onSuccess`              | `() => void`                      | (required)                         | Callback function when verification is successful        |
| `onFailure`              | `() => void`                      | `undefined`                        | Callback when max attempts are reached                   |
| `defaultType`            | `"audio" \| "facial"`             | `"audio"`                          | Initial captcha type to show                             |
| `showTypeSwitcher`       | `boolean`                         | `true`                             | Whether to show tabs for switching between captcha types |
| `maxAttempts`            | `number`                          | `3`                                | Maximum number of attempts allowed                       |
| `difficulty`             | `"easy" \| "medium" \| "hard"`    | `"medium"`                         | Difficulty level for the captcha                         |
| `size`                   | `"small" \| "default" \| "large"` | `"default"`                        | Size of the captcha container                            |
| `className`              | `string`                          | `""`                               | Custom classes for container                             |
| `style`                  | `React.CSSProperties`             | `undefined`                        | Custom styles for container                              |
| `darkMode`               | `boolean`                         | `false`                            | Whether to enable dark mode                              |
| `showSuccessMessage`     | `boolean`                         | `true`                             | Whether to show the success message                      |
| `successMessage`         | `string`                          | `"Human verification successful!"` | Custom success message                                   |
| `successMessageDuration` | `number`                          | `1500`                             | Time in ms to show success message                       |

## Sample Application

A sample application is included to demonstrate the MimicCaptcha integration:

```bash
# Navigate to the sample app directory
cd sample-app

# Run the setup script to set up the models
npm run setup

# Install dependencies
npm install

# Start the development server
npm run dev
```

The sample app showcases a registration form with customizable MimicCaptcha settings.

## Accessibility Features

MimicCaptcha is designed with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Reader Support**: ARIA attributes and live regions for important announcements
- **Multiple Verification Methods**: Users can choose between audio or visual verification
- **Clear Instructions**: Descriptive guidance throughout the verification process
- **Error Handling**: Accessible error states with clear feedback
- **Color Contrast**: Compliant with WCAG color contrast requirements
- **Customization**: Adjustable difficulty levels for different abilities

## License

MIT License © 2025 MimicCaptcha
