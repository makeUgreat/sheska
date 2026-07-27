import { createContext, useContext, type ReactNode } from 'react';
import { type HttpClient } from './http';

const HttpClientContext = createContext<HttpClient | null>(null);

export function HttpClientProvider({
  client,
  children,
}: {
  client: HttpClient;
  children: ReactNode;
}) {
  return (
    <HttpClientContext.Provider value={client}>
      {children}
    </HttpClientContext.Provider>
  );
}

export function useHttpClient(): HttpClient {
  const client = useContext(HttpClientContext);
  if (!client) {
    throw new Error('useHttpClient must be used inside HttpClientProvider');
  }
  return client;
}
