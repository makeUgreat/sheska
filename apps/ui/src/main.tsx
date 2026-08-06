import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/shell';
import { HttpClient, HttpClientProvider } from '@/shared/api';

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
