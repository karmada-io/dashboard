import { Helmet } from "react-helmet-async";
import ClusterOverridePolicyMain from "layout/body/ClusterOverridePolicy";

function ClusterOverridePolicy() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Cluster Override Policy | Karmada</title>
        <meta
          name="cluster override policy"
          content="View cluster override policies"
        />
      </Helmet>
      <ClusterOverridePolicyMain />
    </div>
  );
}

export default ClusterOverridePolicy;
