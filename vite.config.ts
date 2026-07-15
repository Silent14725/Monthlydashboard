import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { exportPptxDevPlugin } from './src/plugins/export-pptx-dev';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), exportPptxDevPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
