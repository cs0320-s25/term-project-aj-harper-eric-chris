# MimiCaptcha Example

This directory contains example implementations of the MimiCaptcha package.

## HTML Example

The `index.html` file demonstrates how the MimiCaptcha components would be integrated into a simple HTML form. This is just a mock-up to show the UI structure - in a real application, you would need to properly install and import the package.

## React Example

For a real implementation in a React application, you would:

1. Install the package:

   ```bash
   npm install mimicaptcha
   ```

2. Import and use the components:

   ```jsx
   import { MimiCaptcha } from "mimicaptcha";

   function MyForm() {
     return (
       <form>
         {/* Form fields */}

         <MimiCaptcha onSuccess={() => console.log("Verified!")} />

         <button type="submit">Submit</button>
       </form>
     );
   }
   ```

## Local Development Testing

To test the package locally in another project:

1. Build the package:

   ```bash
   cd ../  # Go to the package root
   npm run build
   ```

2. Pack it:

   ```bash
   npm pack  # Creates a .tgz file
   ```

3. Install it in your other project:

   ```bash
   cd /path/to/your/project
   npm install /path/to/mimicaptcha-0.1.0.tgz
   ```

4. Use it in your project as shown in the React example above.

## Notes

- The facial captcha requires webcam access.
- The audio captcha requires microphone access.
- Ensure you have a `/models` folder with the necessary face-api.js models in your public directory.
