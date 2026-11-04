import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled with the app (no Google Fonts requests), so they work offline
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import '@fontsource/dm-mono/latin-500.css'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import './theme.css'
import { App } from './App'
import { requestPersistentStorage } from './lib/storage'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
