import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ReactTogether } from 'react-together'


createRoot(document.getElementById('root')!).render(

      <ReactTogether
        sessionParams={{
          apiKey: "2T1aBiJ4pXr1TOdJvRugmxw5IzXM9VNzR88wZjY2Gz",
          appId: "com.example.myapp",
          name: "test-session",
          password: "test-password"
          }}
      >
        <App />
    </ReactTogether>

)
