import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/background.safari.ts',
    content: 'src/content.safari.ts',
    popup: 'src/popup.safari.tsx',
    options: 'src/options.safari.tsx',
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
