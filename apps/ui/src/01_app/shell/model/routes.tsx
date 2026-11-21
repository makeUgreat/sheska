import type { RouteObject } from 'react-router-dom';
import { LandingPage } from '@/pages/landing';
import { PostDetailPage } from '@/pages/post-detail';
import { PostsPage } from '@/pages/posts';
import { PostViewsPage } from '@/pages/post-views';
import { SourceDetailPage } from '@/pages/source-detail';
import { SourceListPage } from '@/pages/source-list';
import { App } from '../ui/app';

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/sources', element: <SourceListPage /> },
      { path: '/sources/:id', element: <SourceDetailPage /> },
      { path: '/posts', element: <PostsPage /> },
      { path: '/posts/:id', element: <PostDetailPage /> },
      { path: '/posts/:id/views', element: <PostViewsPage /> },
    ],
  },
];
