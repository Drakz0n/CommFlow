import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n'; // Initialize i18n before rendering
import App from './App.tsx';
// import { runInitialMigrationIfNeeded } from './bootstrap/migration'; // Migration disabled 

async function start() {
  // await runInitialMigrationIfNeeded(); // Migration disabled 
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

start();
