import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { WEB_PROJECTS } from '../data/webProjects'

export function useWebProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'webProjects'))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const sorted = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => !p.hidden)
            .sort((a, b) => {
              const ao = a.order ?? (parseInt(a.number) - 1)
              const bo = b.order ?? (parseInt(b.number) - 1)
              return ao - bo
            })
          setProjects(sorted)
        } else {
          setProjects(WEB_PROJECTS)
        }
        setLoading(false)
      },
      () => {
        setProjects(WEB_PROJECTS)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  return { projects, loading, setProjects }
}
