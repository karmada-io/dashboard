import { Helmet } from "react-helmet-async";
import ResourceBindingMain from "layout/body/ResourceBinding";

function ResourceBinding() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Resource Bindings | Karmada</title>
        <meta name="resource bindings" content="resource bindings" />
      </Helmet>
      <ResourceBindingMain />
    </div>
  );
}

export default ResourceBinding;
