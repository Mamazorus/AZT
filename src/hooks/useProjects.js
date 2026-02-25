import { useState, useEffect } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '../firebase'
import { PROJECTS } from '../data/projects'

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const snapshot = await getDocs(query(collection(db, 'projects')))

        if (!snapshot.empty) {
          const sorted = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ao = a.order ?? (parseInt(a.number) - 1)
              const bo = b.order ?? (parseInt(b.number) - 1)
              return ao - bo
            })
          setProjects(sorted)
        } else {
          setProjects(PROJECTS)
        }
      } catch {
        setProjects(PROJECTS)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  return { projects, loading, setProjects }
}
