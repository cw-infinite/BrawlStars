import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode double-mounts effects in dev, which would boot the WebGL game
// twice; the game manages its own lifecycle via dispose(), so render directly.
createRoot(document.getElementById('root')!).render(<App />)
