import { useState } from 'react'
import Controls from '../components/Controls'
import ProjectGrid from '../components/ProjectGrid'
import Modal from '../components/Modal'
import { useProjects } from '../hooks/useProjects'

export default function Home() {
  const [currentFilter, setCurrentFilter]     = useState('all')
  const [currentColumns, setCurrentColumns]   = useState(() => window.innerWidth < 640 ? 2 : 3)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen]         = useState(false)

  const { projects, loading } = useProjects()

  const handleProjectClick = (project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
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

      <Modal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}
