import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The browser otherwise restores the previous scroll offset on refresh, which dropped the
// homepage somewhere around the second section instead of the hero.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// Reset before React paints so a restored offset never flashes. Deep links keep their hash.
const initialHash = window.location.hash.slice(1)
if (!initialHash || initialHash === 'home') window.scrollTo(0, 0)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
