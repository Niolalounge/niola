import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LanguageProvider from './components/LanguageProvider'
import ScrollManager from './components/ScrollManager'
import { useLanguage } from './hooks/useLanguage'

const Home = lazy(() => import('./pages/Home'))
const Menu = lazy(() => import('./pages/Menu'))
const Gallery = lazy(() => import('./pages/Gallery'))

function AppContent() {
  const { copy } = useLanguage()

  return (
    <>
      <a className="skip-link" href="#main-content">{copy.a11y.skipToContent}</a>
      <ScrollManager />
      <Navbar />
      <main id="main-content">
        <Suspense fallback={<div className="route-loader" aria-hidden="true"><span /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  )
}
