import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
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
