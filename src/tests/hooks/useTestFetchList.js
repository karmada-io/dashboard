import { useEffect, useState } from "react";

export function useTestFetchList(index) {
  const [data, setData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      const { definitions, paths } = await import("tests/swagger.json");
      const { createMockData, PATH_ENTRIES } = await import(
        "tests/createMockData"
      );
      const mockData = createMockData(
        [PATH_ENTRIES[index]],
        definitions,
        paths
      );
      setData(mockData[0].data);
    };
    run();
    // --------------------------------------------
  }, []);

  return [data, error];
}
