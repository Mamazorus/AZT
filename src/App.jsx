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
  const [ready, setReady] = useState(false)

  return (
    <ProjectsProvider>
      {!ready && <Preloader onComplete={() => setReady(true)} />}

      <div className={`min-h-screen flex flex-col ${ready ? '' : 'invisible'}`}>
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
