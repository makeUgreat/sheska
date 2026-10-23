import { Route, Routes, useLocation } from 'react-router-dom';
import { LandingPage } from '@/pages/landing';
import { PostDetailPage } from '@/pages/post-detail';
import { PostsPage } from '@/pages/posts';
import { SourceDetailPage } from '@/pages/source-detail';
import { SourceListPage } from '@/pages/source-list';
import { Header } from '@/widgets/header';

export function App() {
  const location = useLocation();

  /** The hero is its own terminal window; a second one on top would repeat it. */
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-page-background text-text-primary">
      {!isLanding && <Header />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sources" element={<SourceListPage />} />
        <Route path="/sources/:id" element={<SourceDetailPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
      </Routes>
    </div>
  );
}
