import { useStateTogether } from 'react-together'

export function Count() {
  const [count, setCount] = useStateTogether('counter', 0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}