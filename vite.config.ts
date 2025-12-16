import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Any request starting with /api will be sent to your Python backend
      "/api": "http://localhost:3000",
      // '/api': {
      //   target: 'http://127.0.0.1:3000',
      //   changeOrigin: true,
      //   secure: false,
      // }
    }
  }
})
