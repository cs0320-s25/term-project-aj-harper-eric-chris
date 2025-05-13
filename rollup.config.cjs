const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const { babel } = require("@rollup/plugin-babel");
const terser = require("@rollup/plugin-terser");
const peerDepsExternal = require("rollup-plugin-peer-deps-external");
const postcss = require("rollup-plugin-postcss");
const autoprefixer = require("autoprefixer");
const tailwindcss = require("tailwindcss");
const json = require("@rollup/plugin-json");
const fs = require("fs");
const path = require("path");

// Parse package.json
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./package.json"))
);

module.exports = {
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
      plugins: [tailwindcss("./tailwind.config.cjs"), autoprefixer()],
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
