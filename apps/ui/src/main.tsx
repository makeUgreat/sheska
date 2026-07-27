import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClient } from '@/shared/api/http';
import { HttpClientProvider } from '@/shared/api/http-client-context';
import { App } from './app/App';

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={new QueryClient()}>
        <HttpClientProvider client={new HttpClient(apiBaseUrl)}>
          <App />
        </HttpClientProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
