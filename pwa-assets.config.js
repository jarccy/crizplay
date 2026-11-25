import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Iconos PNG generados desde public/icon.svg.
// Los "transparent" conservan el fondo transparente; iOS y Android (maskable)
// no admiten transparencia, así que esos llevan el fondo oscuro de la app.
const dark = { background: '#0a0a0a', fit: 'contain' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0.05 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.35, resizeOptions: dark },
    apple: { ...minimal2023Preset.apple, padding: 0.3, resizeOptions: dark },
  },
  images: ['public/icon.svg'],
})
