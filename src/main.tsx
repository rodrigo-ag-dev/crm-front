import { createRoot } from 'react-dom/client'
import './index.css'
import './animations.css'
import App from './App.tsx'
import { applyThemePreference, getStoredThemePreference } from './utils/themePreferences'

const initialTheme = getStoredThemePreference()
applyThemePreference(initialTheme)

createRoot(document.getElementById('root')!).render(
  <App />
)
