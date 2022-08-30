import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { TOKEN } from "../constants";
import cookieOps from "../utils/cookieOps";

function ProtectedRoute({ redirectPath = "/login", children }) {
  let authToken = cookieOps.getValue(TOKEN);

  if (!authToken && process.env.REACT_APP_STAGE === "TEST2") {
    authToken = "SECRETE_PASSWORDS1234";
  }

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
