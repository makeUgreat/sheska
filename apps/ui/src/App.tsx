import { Route, Routes } from 'react-router-dom';
import { SourceListPage } from '@/pages/SourceListPage';
import { SourceDetailPage } from '@/pages/SourceDetailPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<SourceListPage />} />
      <Route path="/sources/:id" element={<SourceDetailPage />} />
    </Routes>
  );
}
