import React from "react";
import { Route, Routes, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import Overview from "./pages/Overview";
import PageNotFound from "./pages/Pagenotfound";
import ProtectedRoute from "./routes/ProtectedRoutes";
import Notify from "./components/Notify";
import LoadingSpinner from "./components/LoadingSpinner";
import DashboardTest from "./tests/Playground/DashboardTest";
import Dashboard from "layout";

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
          <Route path="overridepolicy" element={"123"} />
          <Route path="work" element={"123"} />
        </Route>

        <Route path="login" element={<LoginPage />} />
        {
          // playground is a dev feature, remove playground before offciail release
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test" ? (
            <Route exact path="/playground" element={DashboardTest()} />
          ) : null
        }
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
