import { Helmet } from "react-helmet-async";
import OverridePolicyMain from "layout/body/OverridePolicy";

function OverridePolicy() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Override Policy | Karmada</title>
        <meta name="override policy" content="View override policies" />
      </Helmet>
      <OverridePolicyMain />
    </div>
  );
}

export default OverridePolicy;
