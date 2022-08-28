// Single Map having labels for all the tables
export const labelMap = {
  clustername: "Cluster Name",
  labels: "Labels",
  annotations: "Annotations",
  syncmode: "SyncMode",
  apiendpoint: "APIEndpoint",
  provider: "Provider",
  region: "Region",
  zones: "Zones",
  availablenodes: "Number of Available Nodes",
  clusterstate: "Cluster State",
  k8sversion: "Kubernetes Version",
  creationtime: "Creation"
};

// Example rowsdata for a table
export const rowsdata = [
  {
    id: "1",
    clustername: "member1",
    labels: "Label-1",
    annotations: "Annot-1",
    syncmode: "Push",
    apiendpoint: "https://172.18.0.2:6443",
    provider: "",
    region: "",
    zones: "",
    availablenodes: "500/500",
    clusterstate: "Ready",
    k8sversion: "v1.22.0",
    creationtime: "2022-04-15-T19:20:55Z"
  },
  {
    id: "2",
    clustername: "member2",
    labels: "Label-2",
    annotations: "Annot-2",
    syncmode: "Push",
    apiendpoint: "https://172.18.0.2:6447",
    provider: "",
    region: "",
    zones: "",
    availablenodes: "1000/1000",
    clusterstate: "Ready",
    k8sversion: "v1.22.0",
    creationtime: "2022-04-16-T19:21:55Z"
  },
  {
    id: "3",
    clustername: "member3",
    labels: "Label-3",
    annotations: "Annot-3",
    syncmode: "Push",
    apiendpoint: "https://172.18.0.2:6445",
    provider: "",
    region: "",
    zones: "",
    availablenodes: "2000/2000",
    clusterstate: "Ready",
    k8sversion: "v1.22.0",
    creationtime: "2022-04-15-T19:20:55Z"
  },
  {
    id: "4",
    clustername: "member4",
    labels: "Label-4",
    annotations: "Annot-4",
    syncmode: "Push",
    apiendpoint: "https://172.18.0.2:6143",
    provider: "",
    region: "",
    zones: "",
    availablenodes: "3000/3000",
    clusterstate: "Ready",
    k8sversion: "v1.22.0",
    creationtime: "2022-04-17-T19:19:55Z"
  },
  {
    id: "5",
    clustername: "member5",
    labels: "Label-5",
    annotations: "Annot-5",
    syncmode: "Push",
    apiendpoint: "https://172.18.0.2:6443",
    provider: "",
    region: "",
    zones: "",
    availablenodes: "500/500",
    clusterstate: "Ready",
    k8sversion: "v1.22.0",
    creationtime: "2022-04-15-T19:21:55Z"
  }
];
