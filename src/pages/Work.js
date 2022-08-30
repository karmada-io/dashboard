import { Helmet } from "react-helmet-async";
import WorkMain from "layout/body/Work";

function Work() {
  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Works | Karmada</title>
        <meta name="works" content="works" />
      </Helmet>
      <WorkMain />
    </div>
  );
}

export default Work;
