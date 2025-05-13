# MimiCaptcha

A multi-modal CAPTCHA system based on human mimicry. This package provides facial and audio verification challenges to help protect your web applications from bots.

## Features

- **Facial Captcha**: Requires users to mimic a sequence of facial expressions
- **Audio Captcha**: Requires users to match a specific sound frequency with their voice
- **Multi-modal**: Choose between facial, audio, or both verification methods
- **Easy Integration**: Simple React components that can be integrated into any form

## Installation

```bash
npm install mimicaptcha
```

After installation, you need to:

1. **Copy the facial recognition models**:

   ```bash
   mkdir -p public/models
   cp node_modules/mimicaptcha/dist/models/* public/models/
   ```

2. **Install styling dependencies** (if not already installed):

   ```bash
   # If you're using animations
   npm install framer-motion@latest

   # If you're using headless UI components
   npm install @headlessui/react@latest
   ```

## Usage

### Basic Usage

```jsx
import { MimiCaptcha } from "mimicaptcha";

function MyForm() {
  const handleCaptchaSuccess = () => {
    console.log("Captcha verification successful!");
    // Proceed with form submission
  };

  return (
    <form>
      {/* Your form fields */}

      <MimiCaptcha onSuccess={handleCaptchaSuccess} />

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Facial Verification Only

```jsx
import { FacialCaptcha } from "mimicaptcha";

function MyForm() {
  return (
    <form>
      {/* Your form fields */}

      <FacialCaptcha onSuccess={() => console.log("Verified!")} />

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Audio Verification Only

```jsx
import { AudioCaptcha } from "mimicaptcha";

function MyForm() {
  return (
    <form>
      {/* Your form fields */}

      <AudioCaptcha onSuccess={() => console.log("Verified!")} />

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Combined with Mode Selection

```jsx
import { MimiCaptcha } from "mimicaptcha";

function MyForm() {
  return (
    <form>
      {/* Your form fields */}

      <MimiCaptcha
        onSuccess={() => console.log("Verified!")}
        mode="both" // 'facial', 'audio', or 'both'
        defaultMode="facial" // Starting mode when 'both' is selected
      />

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Props

### MimiCaptcha

| Prop        | Type                          | Default  | Description                                              |
| ----------- | ----------------------------- | -------- | -------------------------------------------------------- |
| onSuccess   | function                      | required | Callback function called when verification is successful |
| mode        | 'facial' \| 'audio' \| 'both' | 'both'   | Which verification methods to offer                      |
| defaultMode | 'facial' \| 'audio'           | 'facial' | Default selected mode when 'both' is active              |

### FacialCaptcha

| Prop      | Type     | Default  | Description                                              |
| --------- | -------- | -------- | -------------------------------------------------------- |
| onSuccess | function | required | Callback function called when verification is successful |

### AudioCaptcha

| Prop      | Type     | Default  | Description                                              |
| --------- | -------- | -------- | -------------------------------------------------------- |
| onSuccess | function | required | Callback function called when verification is successful |

## Styling

### CSS Imports

The MimiCaptcha components come with their own built-in styling. For proper styling, you can either:

1. **Use the included CSS** (recommended for most projects):

   In your main CSS file or component, import the MimiCaptcha styles:

   ```jsx
   import "mimicaptcha/dist/lib/mimicaptcha/mimicaptcha.css";
   ```

2. **Use with Tailwind CSS**:

   If your project uses Tailwind CSS, the components should work well with your existing Tailwind setup. Make sure your Tailwind config includes the appropriate content paths:

   ```js
   // tailwind.config.js
   module.exports = {
     content: [
       // ... your existing content
       "./node_modules/mimicaptcha/**/*.{js,jsx,ts,tsx}", // Include mimicaptcha
     ],
     // ... rest of your config
   };
   ```

### Animations

For proper animations and transitions, make sure you have `framer-motion` installed:

```bash
npm install framer-motion@latest
```

This is included as an optional peer dependency and will enhance the user experience with smooth animations during the verification process.

## Local Development & Testing

To build the package:

```bash
npm run build
```

To create a tarball for local testing:

```bash
npm pack  # Creates mimicaptcha-0.1.0.tgz
```

To install in another project locally:

```bash
cd /path/to/your/project
npm install /path/to/mimicaptcha-0.1.0.tgz
```

## Face API Models

The facial captcha requires face-api.js models to be available in your application's public directory.

Models should be placed in:

```
/public/models/
```

The models can be obtained from the [face-api.js repo](https://github.com/justadudewhohacks/face-api.js/tree/master/weights).

Required models:

- tiny_face_detector_model
- face_expression_model
- face_landmark_68_model (or face_landmark_68_tiny_model)

## Troubleshooting

### Styling Issues

If the component doesn't look styled properly:

1. Make sure you've imported the CSS file as shown in the Styling section
2. If using with Tailwind, ensure your configuration includes the MimiCaptcha paths
3. Inspect your browser console for any CSS-related errors

### Animation Issues

If animations aren't working correctly:

1. Verify that `framer-motion` is installed
2. Check if there are any console errors related to motion components

### Face Detection Issues

If facial recognition isn't working:

1. Ensure the models are correctly copied to your `/public/models/` directory
2. Check browser console for any network errors loading the model files
3. Make sure the user has granted webcam permissions

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Requirements

The facial captcha requires a webcam, and the audio captcha requires a microphone. Users will be prompted to allow access when needed.

## License

MIT
