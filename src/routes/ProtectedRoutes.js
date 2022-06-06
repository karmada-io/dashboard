import { Navigate } from "react-router-dom";
import cookieOps from "../utils/cookieOps";
import PropTypes from "prop-types";
function ProtectedRoute({ redirectPath = "/login", children }) {
  const isAuthenticated = cookieOps.getValue("isAuthenticated");
  if (isAuthenticated !== "true") {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
ProtectedRoute.propTypes = {
  redirectPath: PropTypes.string,
  children: PropTypes.element
};
export default ProtectedRoute;
