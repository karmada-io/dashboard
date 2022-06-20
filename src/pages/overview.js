import { Helmet } from "react-helmet-async";
import Navbar from "../components/Navbar";

function Overview() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Overview | Karmada</title>
        <meta name="description" content="Overview page of Karmada Dashboard" />
      </Helmet>
      <Navbar />
      Overview Page
    </div>
  );
}

export default Overview;
