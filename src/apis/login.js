import request from "utils/request";

export function loginApi(token) {
  return request({
    url: "/apis/cluster.karmada.io/v1alpha1/clusters",
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
