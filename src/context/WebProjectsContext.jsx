import { createContext, useContext } from 'react'
import { useWebProjects } from '../hooks/useWebProjects'

const WebProjectsContext = createContext(null)

export function WebProjectsProvider({ children }) {
  const value = useWebProjects()
  return <WebProjectsContext.Provider value={value}>{children}</WebProjectsContext.Provider>
}

export function useWebProjectsContext() {
  return useContext(WebProjectsContext)
}
