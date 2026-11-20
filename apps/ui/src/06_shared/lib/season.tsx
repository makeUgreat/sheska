import { createContext, useContext, type ReactNode } from 'react';

export type Season = 'winter';

const SeasonContext = createContext<Season | null>(null);

export function SeasonProvider({ season, children }: { season: Season | null; children: ReactNode }) {
  return <SeasonContext.Provider value={season}>{children}</SeasonContext.Provider>;
}

export function useSeason(): Season | null {
  return useContext(SeasonContext);
}
