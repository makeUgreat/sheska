import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { SourceListPage } from '@/pages/SourceListPage';
import { SourceDetailPage } from '@/pages/SourceDetailPage';
import { PostListPage } from '@/pages/PostListPage';

function Nav() {
  const { pathname } = useLocation();

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium ${
        pathname.startsWith(to)
          ? 'text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-gray-200 px-4 py-3">
      <div className="mx-auto flex max-w-3xl gap-6">
        {link('/sources', 'Sources')}
        {link('/posts', 'Posts')}
      </div>
    </nav>
  );
}

export function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/sources" element={<SourceListPage />} />
        <Route path="/sources/:id" element={<SourceDetailPage />} />
        <Route path="/posts" element={<PostListPage />} />
      </Routes>
    </>
  );
}
