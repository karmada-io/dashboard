import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import Overview from "./pages/overview";
import PageNotFound from "./pages/pagenotfound";
import ProtectedRoute from "./routes/ProtectedRoutes";
import Playground from "./pages/Playground";

import Notify from "./components/Notify";
import LoadingSpinner from "./components/LoadingSpinner";

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
        <Route path="playground" element={<Playground />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

export default App;
