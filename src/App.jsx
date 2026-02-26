import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Preloader from './components/Preloader'
import Home from './pages/Home'
import About from './pages/About'
import Admin from './pages/Admin'
import ProjectPage from './pages/ProjectPage'
import { ProjectsProvider } from './context/ProjectsContext'

export default function App() {
  const [siteReady,      setSiteReady]      = useState(false)
  const [showPreloader,  setShowPreloader]  = useState(true)

  const handleComplete = () => {
    setTimeout(() => setSiteReady(true), 450)
    setTimeout(() => setShowPreloader(false), 1200)
  }

  return (
    <ProjectsProvider>
      {showPreloader && <Preloader onComplete={handleComplete} />}

      <div className={`min-h-screen flex flex-col ${siteReady ? 'site-ready' : 'opacity-0 pointer-events-none'}`}>
        <Routes>
          {/* Admin — page standalone sans Header/Footer */}
          <Route path="/admin" element={<Admin />} />

          {/* Site public — layout partagé */}
          <Route path="/*" element={
            <>
              <Header />
              <Routes>
                <Route path="/" element={<Home />}>
                  <Route path="project/:id" element={<ProjectPage />} />
                </Route>
                <Route path="/about" element={<About />} />
              </Routes>
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </ProjectsProvider>
  )
}
