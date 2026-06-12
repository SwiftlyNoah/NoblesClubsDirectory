import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './styles/global.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
