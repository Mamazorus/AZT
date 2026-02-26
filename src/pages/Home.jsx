import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import Controls from '../components/Controls'
import ProjectGrid from '../components/ProjectGrid'
import { useProjectsContext } from '../context/ProjectsContext'

export default function Home() {
  const [currentFilter, setCurrentFilter]   = useState('all')
  const [currentColumns, setCurrentColumns] = useState(() => window.innerWidth < 640 ? 2 : 3)

  const { projects, loading } = useProjectsContext()
  const navigate = useNavigate()

  const handleProjectClick = (project) => {
    navigate(`/project/${project.id}`)
  }

  return (
    <>
      <Controls
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
        currentColumns={currentColumns}
        setCurrentColumns={setCurrentColumns}
        totalProjects={projects.length}
      />

      <main className="flex-1 pt-[120px] pb-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-sm text-muted uppercase tracking-wide">LOADING</span>
          </div>
        ) : (
          <ProjectGrid
            projects={projects}
            currentFilter={currentFilter}
            currentColumns={currentColumns}
            onProjectClick={handleProjectClick}
          />
        )}
      </main>

      {/* ProjectPage se monte ici en tant que route enfant (fixed inset-0 → overlay) */}
      <Outlet />
    </>
  )
}
