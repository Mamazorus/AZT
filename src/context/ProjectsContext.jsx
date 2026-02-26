import { createContext, useContext } from 'react'
import { useProjects } from '../hooks/useProjects'

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const value = useProjects()
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjectsContext() {
  return useContext(ProjectsContext)
}
