import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          if (options.startup) {
            options.startup()
          } else {
            options.reload()
          }
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron'
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'm',
    jsxFragment: "'['"
  },
  build: {
    rollupOptions: {
      external: ['electron']
    }
  }
});