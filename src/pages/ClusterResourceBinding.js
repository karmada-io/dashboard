import { Helmet } from "react-helmet-async";
import ClusterResourceBindingMain from "layout/body/ClusterResourceBinding";

function ClusterResourceBinding() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Cluster Resource Bindings | Karmada</title>
        <meta
          name="cluster resource bindings"
          content="cluster resource bindings"
        />
      </Helmet>
      <ClusterResourceBindingMain />
    </div>
  );
}

export default ClusterResourceBinding;
