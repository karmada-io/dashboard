package main

import (
	"fmt"
	"k8s.io/apimachinery/pkg/util/json"
)

func main() {
	memberClusterKubeconfig := `input your kubeconfig`

	data := make(map[string]string)
	data["memberClusterKubeconfig"] = memberClusterKubeconfig
	data["sync_mode"] = "Pull"
	data["member_cluster_name"] = "member1"
	data["member_cluster_endpoint"] = "https://172.18.0.5:6443"
	data["member_cluster_namespace"] = "karmada-system"
	buf, err := json.Marshal(data)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(buf))
}
