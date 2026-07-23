import { Link, Route, Routes } from 'react-router-dom';
import { SourceListPage } from '@/pages/SourceListPage';
import { SourceDetailPage } from '@/pages/SourceDetailPage';
import { PostListPage } from '@/pages/PostListPage';
import { PostDetailPage } from '@/pages/PostDetailPage';

function Footer() {
  return (
    <footer className="border-t border-[#5642421a] bg-white px-4 py-8">
      <div className="mx-auto flex max-w-[800px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <Link
            to="/"
            className="text-2xl font-semibold leading-tight text-[#101319] hover:text-[#e06c75]"
          >
            The Garden
          </Link>
          <p className="mt-1 text-base leading-relaxed text-[#43474f]">
            Built for the curious.
          </p>
        </div>
        <nav className="flex gap-6 text-base leading-relaxed text-[#43474f]">
          <Link to="/posts" className="transition-colors hover:text-[#e06c75]">
            Posts
          </Link>
          <Link
            to="/sources"
            className="transition-colors hover:text-[#e06c75]"
          >
            Sources
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-white text-[#101319]">
      <Routes>
        <Route path="/" element={<PostListPage />} />
        <Route path="/sources" element={<SourceListPage />} />
        <Route path="/sources/:id" element={<SourceDetailPage />} />
        <Route path="/posts" element={<PostListPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
      </Routes>
      <Footer />
    </div>
  );
}
