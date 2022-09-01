import React from "react";
import { Route, Routes, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import Overview from "./pages/overview";
import PageNotFound from "./pages/pagenotfound";
import ProtectedRoute from "./routes/ProtectedRoutes";
import Notify from "./components/Notify";
import LoadingSpinner from "./components/LoadingSpinner";
import Dashboard from "layout";
import OverridePolicy from "pages/OverridePolicy";
import ClusterOverridePolicy from "pages/ClusterOverridePolicy";
import ResourceBinding from "pages/ResourceBinding";
import ClusterResourceBinding from "pages/ClusterResourceBinding";
import Work from "pages/Work";

function App() {
  const status = useSelector((state) => state.root.status);
  const isLoading = useSelector((state) => state.root.isLoading);
  return (
    <div>
      {isLoading ? <LoadingSpinner /> : null}
      {status !== "" ? <Notify /> : null}
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <Dashboard>
                <Outlet />
              </Dashboard>
            </ProtectedRoute>
          }
        >
          <Route path="" element={<Overview />} />
          <Route path="overridePolicy" element={<OverridePolicy />} />
          <Route
            path="clusterOverridePolicy"
            element={<ClusterOverridePolicy />}
          />
          <Route path="resourceBinding" element={<ResourceBinding />} />
          <Route
            path="clusterResourceBinding"
            element={<ClusterResourceBinding />}
          />
          <Route path="works" element={<Work />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
