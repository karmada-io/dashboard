import { Helmet } from "react-helmet-async";
import DashboardContent from "../layout";

function Playground() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Playground | Karmada</title>
        <meta name="description" content="Playground" />
      </Helmet>
      <DashboardContent />
    </div>
  );
}

export default Playground;
