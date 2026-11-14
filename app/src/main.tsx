import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { DataProvider } from './data/DataProvider.tsx'
import './index.css'
import { AppStateProvider } from './state/AppState.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </DataProvider>
  </StrictMode>,
)
