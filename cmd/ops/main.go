package main

import (
	"fmt"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/environment"
	"github.com/karmada-io/dashboard/pkg/resource/event"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

func main() {
	/*
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
	*/
	kubeconfigPath := "/Users/dingwenjiang/.kube/karmada.config"
	client.InitKarmadaConfig(
		client.WithUserAgent(environment.UserAgent()),
		client.WithKubeconfig(kubeconfigPath),
		client.WithKubeContext("karmada-apiserver"),
		client.WithInsecureTLSSkipVerify(true),
	)

	client.InitKubeConfig(
		client.WithUserAgent(environment.UserAgent()),
		client.WithKubeconfig(kubeconfigPath),
		client.WithKubeContext("karmada-host"),
		client.WithInsecureTLSSkipVerify(false),
	)

	// 构建事件的查询选项
	//namespace := "karmada-cluster"
	eventType := corev1.EventTypeNormal
	eventType = eventType
	options := v1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=deployment/nginx"),
	}
	options = options
	// 查询事件
	restConfig, _, err := client.GetKarmadaConfig()
	if err != nil {
		panic(err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		panic(err.Error())
	}

	events, err := event.GetEvents(clientset, "default", "nginx")

	// 打印查询结果
	for _, event := range events {
		fmt.Printf("Event Name: %s\n", event.Name)
		fmt.Printf("Event Type: %s\n", event.Type)
		fmt.Printf("Event Message: %s\n", event.Message)
		fmt.Printf("Event EventTime: %s\n", event.CreationTimestamp.Format("2006-01-02 15:04:05"))
		fmt.Println("-------------------")
	}

}
