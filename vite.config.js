import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        mevzuat: 'mevzuat.html',
        ipc: 'ipc.html',
        favoriler: 'favoriler.html',
        report: 'report.html',
        mevzuatBaglantilari: 'mevzuat-baglantilari.html',
        admin: 'admin.html',
      },
    },
  },
});
