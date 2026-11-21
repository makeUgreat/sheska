import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Header } from '@/widgets/header';

export function App() {
  const location = useLocation();

  /** The hero is its own terminal window; a second one on top would repeat it. */
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-page-background text-text-primary">
      {!isLanding && <Header />}
      <Outlet />
      <ScrollRestoration />
    </div>
  );
}
