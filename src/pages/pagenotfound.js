import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";

function PageNotFound() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>404 - Page Not Found | Karmada</title>
        <meta
          name="description"
          content="Page not found in Karmada Dashboard"
        />
      </Helmet>
      <Navbar />
      <p>There&apos;s nothing here: 404!</p>
    </div>
  );
}

export default PageNotFound;
