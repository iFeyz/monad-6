import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ReactTogether } from 'react-together'


createRoot(document.getElementById('root')!).render(

      <ReactTogether
        sessionParams={{
          apiKey: "2UyoWWPeshm6dVAzSbiuCIljeH5hPmi0eu6jVVQakZ",
          appId: "com.example.myapp",
          name: "test-sessdsdsdsion",
          password: "test-password"
          }}
      >
        <App />
    </ReactTogether>

)
