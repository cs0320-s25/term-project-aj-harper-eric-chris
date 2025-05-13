# Building and Testing MimicCaptcha

This document provides instructions on how to build, test, and integrate the MimicCaptcha component.

## Development Setup

### Installing Dependencies

```bash
# Install dependencies with legacy peer deps to avoid conflicts
npm install --legacy-peer-deps
```

### Development Server

To start the development server for testing:

```bash
npm run dev
```

### Building the Package

To build the package for distribution:

```bash
npm run build:all
```

This will create the following in the `dist` directory:

- CommonJS build (for Node.js environments)
- ES Module build (for modern bundlers)
- TypeScript declaration files

## Integration Testing

### As a Local Dependency

You can test the package locally in another project by using:

```bash
# From your other project
npm link ../path/to/mimicaptcha
```

### Using the Component

```jsx
import { MimicCaptcha } from "mimicaptcha";

function MyForm() {
  const handleSuccess = () => {
    console.log("User verified!");
    // Allow form submission or other actions
  };

  return (
    <div>
      <MimicCaptcha
        onSuccess={handleSuccess}
        defaultType="audio" // or "facial"
      />
    </div>
  );
}
```

## Accessibility Features

The package includes several accessibility enhancements:

- Proper ARIA attributes and roles
- Screen reader announcements
- Keyboard navigation support
- Clear visual feedback for all states
- Detailed error handling with permission notices

## Performance Considerations

- Both audio and facial recognition use local processing (no server required)
- Models for facial recognition are loaded dynamically
- Audio processing uses the Web Audio API with optimized algorithms

## Browser Compatibility

MimicCaptcha works in all modern browsers that support:

- Web Audio API
- getUserMedia API (for camera/microphone access)
- ES6+ JavaScript

## Common Issues

### Permission Errors

If users encounter permission errors:

- Ensure your site is served over HTTPS (required for camera/microphone)
- Add proper explanation of why permissions are needed
- The component will display helpful error messages guiding users

### Styling Conflicts

If you encounter styling conflicts:

- The package uses encapsulated CSS modules
- You can override styles with the `className` prop on the MimicCaptcha component
