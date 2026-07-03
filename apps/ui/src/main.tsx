import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { HttpClient } from '@/api/http';
import { SheskaApiClient } from '@/api/client';
import { App } from './App';

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={new QueryClient()}>
        <ApiClientProvider
          client={new SheskaApiClient(new HttpClient(apiBaseUrl))}
        >
          <App />
        </ApiClientProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
