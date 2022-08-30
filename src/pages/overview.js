import { Helmet } from "react-helmet-async";

function Overview() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Overview | Karmada</title>
        <meta name="description" content="Overview page of Karmada Dashboard" />
      </Helmet>
    </div>
  );
}

export default Overview;
