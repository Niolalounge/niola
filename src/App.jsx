import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LanguageProvider from './components/LanguageProvider'
import ContentProvider from './components/ContentProvider'
import ScrollManager from './components/ScrollManager'
import { useLanguage } from './hooks/useLanguage'

const Home = lazy(() => import('./pages/Home'))
const Menu = lazy(() => import('./pages/Menu'))
const Gallery = lazy(() => import('./pages/Gallery'))
// The dashboard pulls in @supabase/supabase-js for authentication and storage. Keeping it lazy
// keeps all of that out of the bundle a visitor downloads.
const Admin = lazy(() => import('./pages/Admin'))

const routeLoader = <div className="route-loader" aria-hidden="true"><span /></div>

function PublicSite() {
  const { copy } = useLanguage()

  return (
    <>
      <a className="skip-link" href="#main-content">{copy.a11y.skipToContent}</a>
      <ScrollManager />
      <Navbar />
      <main id="main-content">
        <Suspense fallback={routeLoader}>
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
      <ContentProvider>
        <BrowserRouter>
          <Routes>
            {/* The dashboard is a tool, not a page of the site: no navbar, no footer, and no
                smooth-scrolling, which would fight with a long editable table. */}
            <Route
              path="/admin"
              element={<Suspense fallback={routeLoader}><Admin /></Suspense>}
            />
            <Route path="*" element={<PublicSite />} />
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </LanguageProvider>
  )
}
