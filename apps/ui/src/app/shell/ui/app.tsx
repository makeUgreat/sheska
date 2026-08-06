import { Route, Routes, useLocation } from 'react-router-dom';
import { LandingPage } from '@/pages/landing';
import { PostDetailPage } from '@/pages/post-detail';
import { PostsPage } from '@/pages/posts';
import { SourceDetailPage } from '@/pages/source-detail';
import { SourceListPage } from '@/pages/source-list';
import { Footer } from '@/widgets/footer';

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
