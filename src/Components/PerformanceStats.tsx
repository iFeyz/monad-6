import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Stats from 'stats.js'

const PerformanceStats = () => {
  const statsRef = useRef<Stats | null>(null)

  useEffect(() => {
    const stats = new Stats()
    statsRef.current = stats
    
    stats.showPanel(0) 
    
    stats.dom.style.position = 'absolute'
    stats.dom.style.top = '0px'
    stats.dom.style.left = '0px'
    stats.dom.style.zIndex = '1000'
    
    document.body.appendChild(stats.dom)
    
    stats.dom.addEventListener('click', () => {
      stats.showPanel((stats.dom as any).panel++ % stats.dom.children.length)
    })

    return () => {
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