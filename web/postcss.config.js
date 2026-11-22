import { fileURLToPath } from 'node:url'

// Explicit config path so Tailwind works whatever the current directory (IDE, monorepo root, Docker).
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
}
