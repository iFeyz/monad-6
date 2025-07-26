import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import Stats from 'stats.js'

const PerformanceStats = () => {
  const statsRef = useRef<Stats | null>(null)
  const { gl } = useThree()

  useEffect(() => {
    // Créer l'instance Stats
    const stats = new Stats()
    statsRef.current = stats
    
    // Configurer le panneau par défaut (0: fps, 1: ms, 2: mb)
    stats.showPanel(0) // FPS par défaut
    
    // Styliser et positionner
    stats.dom.style.position = 'absolute'
    stats.dom.style.top = '0px'
    stats.dom.style.left = '0px'
    stats.dom.style.zIndex = '1000'
    
    // Ajouter au DOM
    document.body.appendChild(stats.dom)
    
    // Ajouter un gestionnaire de clic pour changer de panneau
    stats.dom.addEventListener('click', () => {
      stats.showPanel(++stats.dom.panel % stats.dom.children.length)
    })

    return () => {
      // Nettoyage
      if (stats.dom && stats.dom.parentNode) {
        document.body.removeChild(stats.dom)
      }
    }
  }, [])

  useFrame(() => {
    if (statsRef.current) {
      statsRef.current.update()
    }
  })

  return null
}

export default PerformanceStats