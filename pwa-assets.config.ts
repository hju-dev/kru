import {
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

const BG = '#17151F'

// Run `npm run icons` after changing public/kru-logo.svg. Output goes into public/.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BG } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BG } },
    // iOS matches startup images by CSS size x pixel ratio: 375x812 @3x = 1125x2436
    appleSplashScreens: createAppleSplashScreens(
      { padding: 0.6, resizeOptions: { background: BG, fit: 'contain' } },
      ['iPhone 13 mini'],
    ),
  },
  images: ['public/kru-logo.svg'],
})
