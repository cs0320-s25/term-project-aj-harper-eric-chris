# MimicCaptcha

A modern, accessible CAPTCHA alternative for React applications that uses mimicry-based human verification.

## Features

- **Dual Verification Modes**: Audio tone mimicry and facial expression mimicry
- **Accessibility-First Design**: Built with WCAG guidelines in mind
- **Highly Customizable**: Configure difficulty, attempts, size, and more
- **Standalone**: No external API dependencies, works locally
- **Developer-Friendly**: Simple API with TypeScript support
- **Works with any React application**: No framework-specific dependencies

## Demo Application

The repository includes a demo application that showcases the MimicCaptcha components in action:

### Features in Demo

- **Form Demo**: A complete contact form with CAPTCHA verification
- **Combined Setup**: Showcases the components working together with tab switching
- **Individual Components**: Demonstrates how to use each component separately

### Captcha Options

- **Audio Mimicry**: Users mimic a played tone to verify they're human
- **Facial Mimicry**: Users match facial expressions to verify they're human

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

### Using Individual Components

You can also use the individual components directly:

```jsx
import React, { useState } from "react";
import { AudioCaptcha, ExpressionSequence } from "mimicaptcha";

function CustomForm() {
  const [isVerified, setIsVerified] = useState(false);

  const handleCaptchaSuccess = () => {
    setIsVerified(true);
    console.log("Verification successful!");
  };

  return (
    <form>
      {/* Form fields */}

      {/* Audio captcha */}
      <AudioCaptcha onSuccess={handleCaptchaSuccess} />

      {/* OR Facial expression captcha */}
      <ExpressionSequence onSuccess={handleCaptchaSuccess} />

      <button type="submit" disabled={!isVerified}>
        Submit
      </button>
    </form>
  );
}
```

### Form Demo Integration

The Form Demo in our application shows how to integrate both captcha types within a form:

1. Present the user with captcha type options
2. Allow them to complete the verification
3. Enable form submission only after verification
4. Process the form data after submission

## Running the Demo

To run the demo application:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
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

## Accessibility Features

MimicCaptcha is designed with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Reader Support**: ARIA attributes and live regions for important announcements
- **Multiple Verification Methods**: Users can choose between audio or visual verification
- **Clear Instructions**: Descriptive guidance throughout the verification process
- **Error Handling**: Accessible error states with clear feedback
- **Color Contrast**: Compliant with WCAG color contrast requirements
- **Customization**: Adjustable difficulty levels for different abilities

## Recent Fixes

- Fixed facial mimicry camera initialization and display
- Improved video element loading reliability
- Added fallback mechanisms for camera access

## License

MIT License © 2025 MimicCaptcha
