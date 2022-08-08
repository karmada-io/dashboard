import { Helmet } from "react-helmet-async";
import DashboardTest from "./Playground/DashboardTest";

function Playground() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Playground | Karmada</title>
        <meta name="description" content="Playground" />
      </Helmet>
      <DashboardTest />
    </div>
  );
}

export default Playground;
