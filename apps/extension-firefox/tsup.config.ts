import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/background.firefox.ts',
    content: 'src/content.firefox.ts',
    popup: 'src/popup.firefox.tsx',
    options: 'src/options.firefox.tsx',
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
