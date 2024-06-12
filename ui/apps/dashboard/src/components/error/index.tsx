import type { ResultProps } from "antd";
import { Result } from "antd";

const ErrorBoundary = (props: ResultProps) => {
    return (
        <Result
            style={{ marginTop: "50vh", transform: "translateY(-50%)" }}
            status={"500"}
            extra={"有点累了，刷新试试"}
            {...props}
        />
    );
};

export default ErrorBoundary;
