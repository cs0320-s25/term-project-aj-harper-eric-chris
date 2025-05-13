import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { babel } from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import json from "@rollup/plugin-json";
import { readFileSync } from "fs";

// Parse package.json
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
);

export default {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    {
      file: pkg.module,
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
  ],
  plugins: [
    // Extract peer dependencies
    peerDepsExternal(),

    // JSON support for package.json
    json(),

    // Bundle CSS and process with Tailwind CSS
    postcss({
      plugins: [tailwindcss("./tailwind.config.js"), autoprefixer()],
      extract: false,
      modules: true,
      autoModules: true,
      minimize: true,
      inject: false,
    }),

    // Resolve node_modules
    resolve({
      browser: true,
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    }),

    // Convert CommonJS modules to ES6
    commonjs({
      include: "node_modules/**",
    }),

    // Compile TypeScript
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false,
    }),

    // Transpile with Babel
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: [
        "@babel/preset-env",
        "@babel/preset-react",
        "@babel/preset-typescript",
      ],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    }),

    // Minify for production
    terser(),
  ],
  // External dependencies that shouldn't be bundled
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    "react/jsx-runtime",
  ],
};
