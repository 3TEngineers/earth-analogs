import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { DataProvider } from './data/DataProvider.tsx'
import './index.css'
import { AppStateProvider } from './state/AppState.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
