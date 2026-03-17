/**
 * Vite Configuration for UniversalCart Extension
 *
 * Builds the Chrome Extension with:
 * - Multiple entry points (service worker, content scripts, popup, pages)
 * - TypeScript support
 * - Source maps for development
 * - Minification for production
 * - Auto-copy of static assets (manifest.json, icons, HTML)
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      minify: isDev ? false : 'terser',

      rollupOptions: {
        input: {
          // Background service worker
          'background/service-worker': resolve(__dirname, 'background/service-worker.js'),

          // Content scripts
          'content/cart-detector': resolve(__dirname, 'content/cart-detector.js'),
          'content/overlay': resolve(__dirname, 'content/overlay.js'),

          // Popup
          'popup/popup': resolve(__dirname, 'popup/popup.js'),

          // Extension pages
          'dashboard/dashboard': resolve(__dirname, 'dashboard/dashboard.js'),
          'settings/settings': resolve(__dirname, 'settings/settings.js'),
          'analytics/analytics': resolve(__dirname, 'analytics/analytics.js'),
        },

        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'shared/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',

          // Chrome extensions can't use ES modules in service workers
          format: 'iife',

          // Each entry should be a standalone file (no code splitting for content scripts)
          manualChunks: undefined,
        },
      },

      // Chrome extension content scripts need to be self-contained
      cssCodeSplit: false,

      // Target Chrome 110+ (Manifest V3)
      target: 'chrome110',
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'shared'),
      },
    },

    // Define global constants
    define: {
      __DEV__: JSON.stringify(isDev),
      __VERSION__: JSON.stringify(process.env.npm_package_version || '0.5.0'),
    },
  };
});
