# MimicCaptcha

A modern, accessible CAPTCHA alternative based on human mimicry capabilities.

[![npm version](https://img.shields.io/npm/v/mimicaptcha.svg)](https://www.npmjs.com/package/mimicaptcha)
[![license](https://img.shields.io/npm/l/mimicaptcha.svg)](https://github.com/user/mimicaptcha/blob/main/LICENSE)

MimicCaptcha provides a more engaging, interactive, and accessible alternative to traditional CAPTCHA systems. Instead of deciphering distorted text or selecting images, users prove they're human by mimicking audio tones or facial expressions.

## Features

- 🔊 **Audio Tone Matching**: Users mimic a tone with their voice
- 😀 **Facial Expression Matching**: Users match a series of facial expressions
- ♿ **Accessibility First**: Built with a focus on accessibility standards
- 🎨 **Customizable**: Easy to integrate and style with your application
- 🔥 **Framework Agnostic**: Works with any React-based application

## Installation

```bash
npm install mimicaptcha
# or
yarn add mimicaptcha
```

## Usage

MimicCaptcha can be used as a standalone component or integrated into forms:

```jsx
import React, { useState } from "react";
import { MimicCaptcha } from "mimicaptcha";

function MyForm() {
  const [verified, setVerified] = useState(false);

  const handleSuccess = () => {
    setVerified(true);
    // Now you can allow form submission
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      <MimicCaptcha
        onSuccess={handleSuccess}
        defaultType="audio" // or "facial"
        showTypeSwitcher={true}
      />

      <button type="submit" disabled={!verified}>
        Submit
      </button>
    </form>
  );
}
```

## Component Options

### MimicCaptcha Component

| Prop               | Type                  | Default    | Description                                                    |
| ------------------ | --------------------- | ---------- | -------------------------------------------------------------- |
| `onSuccess`        | `() => void`          | (required) | Function called when user successfully completes the challenge |
| `defaultType`      | `"audio" \| "facial"` | `"audio"`  | Initial captcha type to display                                |
| `showTypeSwitcher` | `boolean`             | `true`     | Whether to show tabs to switch between audio/facial            |
| `className`        | `string`              | `""`       | Additional CSS classes for the container                       |
| `style`            | `CSSProperties`       | `{}`       | Inline styles for the container                                |

### Individual Components

You can also use the individual CAPTCHA components if you prefer:

```jsx
import { AudioCaptcha, ExpressionSequence } from 'mimicaptcha';

// For audio only
<AudioCaptcha onSuccess={handleSuccess} />

// For facial expressions only
<ExpressionSequence onSuccess={handleSuccess} />
```

## Accessibility Features

MimicCaptcha has been designed with accessibility in mind:

- **Audio Captcha**: Screen reader announcements for all states, keyboard navigation support
- **Facial Captcha**: Clear visual indicators, appropriate alt-text, camera permission handling
- **ARIA attributes**: Proper labeling, live regions, and role attributes
- **Keyboard Navigation**: Full support for keyboard navigation
- **Error States**: Clear and descriptive error messages with visual cues
- **Device Permissions**: Clear explanations when camera or microphone permissions are needed

## Browser Support

MimicCaptcha works in all modern browsers that support the Web Audio API and getUserMedia API:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT © [Your Organization]
