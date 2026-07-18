import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/helix-scheduler/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
