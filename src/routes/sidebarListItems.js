export const listItems = [
  {
    key: "Cluster Management",
    sub: [{ key: "Cluster" }, { key: "Other Cluster Resources" }]
  },
  {
    key: "Propagation Policy",
    sub: [{ key: "Propagation Policy" }]
  },
  {
    key: "Override Policy",
    sub: [
      { key: "Override Policy", to: "overridePolicy" },
      { key: "Cluster Override Policy", to: "clusterOverridePolicy" }
    ]
  },
  {
    key: "Resource Binding",
    sub: [
      { key: "Resource Binding", to: "resourceBinding" },
      { key: "Cluster Resource Binding", to: "clusterResourceBinding" }
    ]
  },
  { key: "Works", to: "works" },
  { key: "Settings" },
  { key: "About" }
];
