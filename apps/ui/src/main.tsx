import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/shell';
import { HttpClient, HttpClientProvider, shouldRetryQuery } from '@/shared/api';
import { SeasonProvider, type Season } from '@/shared/lib';
import { AttachmentBaseUrlProvider } from '@/shared/ui';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
const attachmentBaseUrl = requireAbsoluteUrl('VITE_ATTACHMENT_BASE_URL', import.meta.env.VITE_ATTACHMENT_BASE_URL as string | undefined);
const season = readSeason(import.meta.env.VITE_SEASON as string | undefined);
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider
        client={
          new QueryClient({
            queryCache: new QueryCache({
              onError: (error, query) => {
                console.error(`Query ${String(query.queryKey)} failed:`, error);
              },
            }),
            defaultOptions: { queries: { retry: shouldRetryQuery } },
          })
        }
      >
        <HttpClientProvider client={new HttpClient(apiBaseUrl)}>
          <AttachmentBaseUrlProvider baseUrl={attachmentBaseUrl}>
            <SeasonProvider season={season}>
              <App />
            </SeasonProvider>
          </AttachmentBaseUrlProvider>
        </HttpClientProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);

function requireAbsoluteUrl(name: string, value: string | undefined): string {
  if (!value || !URL.canParse(value)) {
    throw new Error(`${name} must be an absolute URL`);
  }
  return value.replace(/\/+$/, '');
}

function readSeason(value: string | undefined): Season | null {
  switch (value) {
    case undefined:
    case '':
      return null;
    case 'winter':
      return value;
    default:
      throw new Error(`VITE_SEASON must be empty or winter, got ${value}`);
  }
}
