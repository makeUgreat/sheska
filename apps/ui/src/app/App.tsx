import { Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from '@/shared/layout/footer';
import { SourceListPage } from '@/pages/SourceListPage';
import { SourceDetailPage } from '@/pages/SourceDetailPage';
import { MainPage } from '@/pages/MainPage';
import { PostDetailPage } from '@/pages/PostDetailPage';

export function App() {
  const location = useLocation();
  const isMainRoute =
    location.pathname === '/' || location.pathname === '/posts';

  return (
    <div className="min-h-screen bg-page-background text-text-primary">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/sources" element={<SourceListPage />} />
        <Route path="/sources/:id" element={<SourceDetailPage />} />
        <Route path="/posts" element={<MainPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
      </Routes>
      {!isMainRoute && <Footer />}
    </div>
  );
}
