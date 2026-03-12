import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: 'spec',
  version: '0.1.0',
  description: 'A CLI built with Bunli',
  
  commands: {
    directory: './src/commands'
  },
  
  build: {
    entry: './src/index.ts',
    outdir: './dist',
    targets: ['native'],
    minify: true,
    sourcemap: false,
    compress: false
  },
  
  dev: {
    watch: true,
    inspect: true
  },
  
  test: {
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: true,
    watch: false
  },

  plugins: [],
})
