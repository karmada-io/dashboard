import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { routes } from './route.tsx';
import { routerBase } from '@/services/base';

const router = createBrowserRouter(routes, {
  basename: routerBase,
});
export default function Router() {
  return <RouterProvider router={router} />;
}
