import { useEffect, useState } from "react";
import { getRequest } from "utils/request";
export function useFetchList(request) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processRequest = async () => {
      await getRequest(request).then(
        (res) => setData(res),
        (err) => {
          setError(err.code);
        }
      );
    };
    processRequest();
  }, []);

  return [data, error];
}
