import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://nobilis.nobles.edu/clubs, so all asset URLs
// and the router are rooted at /clubs/.
export default defineConfig({
  base: '/clubs/',
  plugins: [react()],
  server: {
    // The Veracross role probe goes through the school's PHP API; same-origin
    // in production, proxied in dev.
    proxy: {
      '/theappserver': {
        target: 'https://nobilis.nobles.edu',
        changeOrigin: true,
      },
    },
  },
});
