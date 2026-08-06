import { Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from '@/shared/layout/footer';
import { SourceListPage } from '@/pages/SourceListPage';
import { SourceDetailPage } from '@/pages/SourceDetailPage';
import { LandingPage } from '@/pages/LandingPage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { PostsPage } from '@/pages/PostsPage';

export function App() {
  const location = useLocation();
  const ownsFooter =
    location.pathname === '/' || location.pathname === '/posts';

  return (
    <div className="min-h-screen bg-page-background text-text-primary">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sources" element={<SourceListPage />} />
        <Route path="/sources/:id" element={<SourceDetailPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
      </Routes>
      {!ownsFooter && <Footer />}
    </div>
  );
}
