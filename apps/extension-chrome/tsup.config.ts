import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/background.chrome.ts',
    content: 'src/content.chrome.ts',
    popup: 'src/popup.chrome.tsx',
    options: 'src/options.chrome.tsx',
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: false,
  target: 'es2022',
  outDir: 'dist',
  noExternal: ['@ext/core', '@ext/ui', 'react', 'react-dom', 'react/jsx-runtime'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
});
