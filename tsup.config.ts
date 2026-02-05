import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false, // Disabled for smaller package size
  clean: true,
  minify: true, // Enable minification
  external: ['react', 'react-dom'],
  injectStyle: false,
  loader: {
    '.css': 'copy',
  },
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
  onSuccess: 'cp src/styles.css dist/styles.css && npx lightningcss --minify --targets "> 0.5%, not dead" dist/styles.css -o dist/styles.css',
});
