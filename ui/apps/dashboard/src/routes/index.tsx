import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { routes } from './route.tsx';

const router = createBrowserRouter(routes);
export default function Router() {
  return <RouterProvider router={router} />;
}
