import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import Stats from 'stats.js'

const PerformanceStats = () => {
  const statsRef = useRef<Stats | null>(null)
  const { gl } = useThree()

  useEffect(() => {
    // Create Stats instance
    const stats = new Stats()
    statsRef.current = stats
    
    // Configure default panel (0: fps, 1: ms, 2: mb)
    stats.showPanel(0) // FPS by default
    
    // Style and position
    stats.dom.style.position = 'absolute'
    stats.dom.style.top = '0px'
    stats.dom.style.left = '0px'
    stats.dom.style.zIndex = '1000'
    
    // Add to DOM
    document.body.appendChild(stats.dom)
    
    // Add click handler to change panel
    stats.dom.addEventListener('click', () => {
      stats.showPanel((stats.dom as any).panel++ % stats.dom.children.length)
    })

    return () => {
      // Cleanup
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