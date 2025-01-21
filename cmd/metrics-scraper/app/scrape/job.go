/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package scrape

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubeclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Define a struct for save requests
type SaveRequest struct {
	appName string
	podName string
	data    *db.ParsedData
	result  chan error
}

func FetchMetrics(ctx context.Context, appName string, requests chan SaveRequest) (map[string]*db.ParsedData, []string, error) {
	kubeClient := client.InClusterClient()
	podsMap, errors := getKarmadaPods(ctx, appName) // Pass context here
	if len(podsMap) == 0 && len(errors) > 0 {
		return nil, errors, fmt.Errorf("no pods found")
	}
	allMetrics := make(map[string]*db.ParsedData)
	var mu sync.Mutex
	var wg sync.WaitGroup
	for clusterName, pods := range podsMap {
		for _, pod := range pods {
			wg.Add(1)
			go func(ctx context.Context, pod db.PodInfo, clusterName string) {
				defer wg.Done()
				select {
				case <-ctx.Done():
					return
				default:
				}
				var jsonMetrics *db.ParsedData
				var err error
				if appName == db.KarmadaAgent {
					jsonMetrics, err = getKarmadaAgentMetrics(ctx, pod.Name, clusterName, requests)
					if err != nil {
						mu.Lock()
						errors = append(errors, err.Error())
						mu.Unlock()
						return
					}
				} else {
					port := db.SchedulerPort
					if appName == db.KarmadaControllerManager {
						port = db.ControllerManagerPort
					}
					metricsOutput, err := kubeClient.CoreV1().RESTClient().Get().
						Namespace(db.Namespace).
						Resource("pods").
						SubResource("proxy").
						Name(fmt.Sprintf("%s:%s", pod.Name, port)).
						Suffix("metrics").
						Do(ctx).Raw() // Use the context here
					if err != nil {
						mu.Lock()
						errors = append(errors, err.Error())
						mu.Unlock()
						return
					}
					jsonMetrics, err = parseMetricsToJSON(string(metricsOutput))
					if err != nil {
						mu.Lock()
						errors = append(errors, "Failed to parse metrics to JSON")
						mu.Unlock()
						return
					}
					// Send save request without waiting
					select {
					case requests <- SaveRequest{
						appName: appName,
						podName: pod.Name,
						data:    jsonMetrics,
						result:  nil, // Not waiting for result
					}:
					case <-ctx.Done():
						return
					}
				}
				mu.Lock()
				allMetrics[pod.Name] = jsonMetrics
				mu.Unlock()
			}(ctx, pod, clusterName)
		}
	}
	wg.Wait()
	return allMetrics, errors, nil
}

func getKarmadaPods(ctx context.Context, appName string) (map[string][]db.PodInfo, []string) {
	kubeClient := client.InClusterClient()
	podsMap := make(map[string][]db.PodInfo)
	var errors []string

	if appName == db.KarmadaAgent {
		karmadaClient := client.InClusterKarmadaClient()
		clusters, err := karmadaClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to list clusters: %v", err))
			return podsMap, errors
		}

		for _, cluster := range clusters.Items {
			if strings.EqualFold(string(cluster.Spec.SyncMode), "Pull") {
				pods, err := getClusterPods(ctx, &cluster)
				if err != nil {
					errors = append(errors, fmt.Sprintf("Cluster %s: %v", cluster.Name, err))
				} else {
					podsMap[cluster.Name] = pods
				}
			}
		}
	} else {
		pods, err := kubeClient.CoreV1().Pods(db.Namespace).List(ctx, metav1.ListOptions{
			LabelSelector: fmt.Sprintf("app=%s", appName),
		})
		if err != nil {
			errors = append(errors, fmt.Sprintf("failed to list pods: %v", err))
			return podsMap, errors
		}

		for _, pod := range pods.Items {
			podsMap[appName] = append(podsMap[appName], db.PodInfo{Name: pod.Name})
		}
	}

	return podsMap, errors
}

func getClusterPods(ctx context.Context, cluster *v1alpha1.Cluster) ([]db.PodInfo, error) {
	fmt.Printf("Getting pods for cluster: %s\n", cluster.Name)

	kubeconfigPath := os.Getenv("KUBECONFIG")
	if kubeconfigPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get user home directory: %v", err)
		}
		kubeconfigPath = filepath.Join(homeDir, ".kube", "karmada.config")
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build config for cluster %s: %v", cluster.Name, err)
	}

	config.Host = fmt.Sprintf("%s/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy", config.Host, cluster.Name)

	kubeClient, err := kubeclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubeclient for cluster %s: %v", cluster.Name, err)
	}

	podList, err := kubeClient.CoreV1().Pods("karmada-system").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods for cluster %s: %v", cluster.Name, err)
	}

	fmt.Printf("Found %d pods in cluster %s\n", len(podList.Items), cluster.Name)

	var podInfos []db.PodInfo
	for _, pod := range podList.Items {
		podInfos = append(podInfos, db.PodInfo{
			Name: pod.Name,
		})
	}

	return podInfos, nil
}

func getKarmadaAgentMetrics(ctx context.Context, podName string, clusterName string, requests chan SaveRequest) (*db.ParsedData, error) {
	kubeClient := client.InClusterKarmadaClient()
	clusters, err := kubeClient.ClusterV1alpha1().Clusters().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %v", err)
	}

	for _, cluster := range clusters.Items {
		if strings.EqualFold(string(cluster.Spec.SyncMode), "Pull") {
			clusterName = cluster.Name
			break
		}
	}

	if clusterName == "" {
		return nil, fmt.Errorf("no cluster in 'Pull' mode found")
	}

	kubeconfigPath := os.Getenv("KUBECONFIG")
	if kubeconfigPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get user home directory: %v", err)
		}
		kubeconfigPath = filepath.Join(homeDir, ".kube", "karmada.config")
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build config for cluster %s: %v", clusterName, err)
	}

	config.Host = fmt.Sprintf("%s/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy", config.Host, clusterName)

	restClient, err := kubeclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create REST client for cluster %s: %v", clusterName, err)
	}

	metricsOutput, err := restClient.CoreV1().RESTClient().Get().
		Namespace("karmada-system").
		Resource("pods").
		SubResource("proxy").
		Name(fmt.Sprintf("%s:8080", podName)).
		Suffix("metrics").
		Do(ctx).Raw()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve metrics: %v", err)
	}

	var parsedData *db.ParsedData
	if isJSON(metricsOutput) {
		parsedData = &db.ParsedData{}
		err = json.Unmarshal(metricsOutput, parsedData)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal JSON metrics: %v", err)
		}
	} else {
		var parsedDataPtr *db.ParsedData
		parsedDataPtr, err = parseMetricsToJSON(string(metricsOutput))
		if err != nil {
			return nil, fmt.Errorf("failed to parse metrics to JSON: %v", err)
		}
		parsedData = parsedDataPtr
	}

	// Send save request to the database worker
	select {
	case requests <- SaveRequest{
		appName: db.KarmadaAgent,
		podName: podName,
		data:    parsedData,
		result:  nil, // Not waiting for result
	}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	return parsedData, nil
}
