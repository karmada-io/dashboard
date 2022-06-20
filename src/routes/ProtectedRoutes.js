import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { TOKEN } from "../constants";
import cookieOps from "../utils/cookieOps";

function ProtectedRoute({ redirectPath = "/login", children }) {
  const authToken = cookieOps.getValue(TOKEN);

  if (!authToken) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  redirectPath: PropTypes.string,
  children: PropTypes.element
};

export default ProtectedRoute;
