import { createContext, useContext, type ReactNode } from 'react';

const AttachmentBaseUrlContext = createContext<string | null>(null);

export function AttachmentBaseUrlProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  return <AttachmentBaseUrlContext.Provider value={baseUrl}>{children}</AttachmentBaseUrlContext.Provider>;
}

export function useAttachmentBaseUrl(): string {
  const baseUrl = useContext(AttachmentBaseUrlContext);
  if (baseUrl === null) {
    throw new Error('useAttachmentBaseUrl must be used inside AttachmentBaseUrlProvider');
  }
  return baseUrl;
}
