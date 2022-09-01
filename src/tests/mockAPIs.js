import axios from "axios";
import MockAdapter from "axios-mock-adapter";

export function runMockAdaptor(mockData, pathEntries) {
  const mock = new MockAdapter(axios);
  mockData.forEach((res, index) => {
    mock.onGet(pathEntries[index].path).reply(res.status, res.data);
  });
}
