import React from "react";
import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import Overview from "./pages/overview";
import PageNotFound from "./pages/pagenotfound";
import ProtectedRoute from "./routes/ProtectedRoutes";
import Notify from "./components/Notify";
import LoadingSpinner from "./components/LoadingSpinner";
import DashboardTest from "./tests/Playground/DashboardTest";

function App() {
  const status = useSelector((state) => state.root.status);
  const isLoading = useSelector((state) => state.root.isLoading);
  return (
    <div>
      {isLoading ? <LoadingSpinner /> : null}
      {status !== "" ? <Notify /> : null}
      <Routes>
        <Route
          index
          element={
            <ProtectedRoute>
              <Overview />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<LoginPage />} />
        {console.log(process.env.NODE_ENV)}
        {
          // playground is a dev feature, remove playground before offciail release
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test" ? (
            <Route path="playground" element={DashboardTest()} />
          ) : null
        }
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
