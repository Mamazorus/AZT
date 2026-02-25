import { useMemo } from 'react'
import ProjectCard from './ProjectCard'

export default function ProjectGrid({ projects = [], currentFilter, currentColumns, onProjectClick }) {
  // Filtrer les projets
  const filteredProjects = useMemo(() => {
    if (currentFilter === 'all') return projects
    return projects.filter(p => p.category === currentFilter)
  }, [projects, currentFilter])

  // Classes de grille dynamiques
  const getGridClasses = () => {
    const base = 'grid'
    const gap  = 'gap-4 md:gap-6'

    switch (currentColumns) {
      case 1:  return `${base} grid-cols-1 ${gap}`
      case 2:  return `${base} grid-cols-2 ${gap}`
      case 3:  return `${base} grid-cols-2 sm:grid-cols-3 ${gap}`
      case 6:  return `${base} grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${gap}`
      default: return `${base} grid-cols-2 sm:grid-cols-3 ${gap}`
    }
  }

  return (
    <section className="px-4 md:px-6 py-6">
      <div className={getGridClasses()}>
        {filteredProjects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onClick={onProjectClick}
          />
        ))}
      </div>
    </section>
  )
}
