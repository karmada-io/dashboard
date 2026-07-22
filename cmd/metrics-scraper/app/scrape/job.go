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
	"io"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubeclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/db"
	"github.com/karmada-io/dashboard/pkg/client"
)

// SaveRequest Define a struct for save requests
type SaveRequest struct {
	appName string
	podName string
	data    *db.ParsedData
	result  chan error
}

const metricsRequestTimeout = 10 * time.Second

// DiscoverComponentPods returns live Kubernetes pod names for a metrics
// component without depending on the component's metrics database.
func DiscoverComponentPods(ctx context.Context, appName string) ([]string, []string, error) {
	if db.GetComponentConfig(appName) == nil {
		return nil, nil, fmt.Errorf("unsupported metrics component %q", appName)
	}

	podsByCluster, warnings := getKarmadaPods(ctx, appName)
	uniqueNames := make(map[string]struct{})
	for _, pods := range podsByCluster {
		for _, pod := range pods {
			uniqueNames[pod.Name] = struct{}{}
		}
	}
	podNames := make([]string, 0, len(uniqueNames))
	for name := range uniqueNames {
		podNames = append(podNames, name)
	}
	sort.Strings(podNames)

	if len(podNames) == 0 && len(warnings) > 0 {
		return podNames, warnings, fmt.Errorf("failed to discover %s pods", appName)
	}
	return podNames, warnings, nil
}

// FetchMetrics fetches metrics from all pods of the given app name
func FetchMetrics(ctx context.Context, appName string, requests chan SaveRequest) (map[string]*db.ParsedData, []string, error) {
	kubeClient := client.InClusterClient()
	componentConfig := db.GetComponentConfig(appName)
	if componentConfig == nil {
		return nil, nil, fmt.Errorf("unsupported metrics component %q", appName)
	}
	podsMap, errors := getKarmadaPods(ctx, appName) // Pass context here
	podCount := 0
	for _, pods := range podsMap {
		podCount += len(pods)
	}
	if podCount == 0 {
		return nil, errors, fmt.Errorf("no pods found for component %q", appName)
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
					jsonMetrics, err = getKarmadaAgentMetrics(ctx, pod.Name, clusterName)
					if err != nil {
						mu.Lock()
						errors = append(errors, err.Error())
						mu.Unlock()
						return
					}
				} else {
					metricsOutput, err := getMetricsFromHostClusterPod(ctx, kubeClient, pod, componentConfig)
					if err != nil {
						mu.Lock()
						errors = append(errors, fmt.Sprintf("pod %s: %v", pod.Name, err))
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
				}
				if err = persistMetrics(ctx, requests, appName, pod.Name, jsonMetrics); err != nil {
					mu.Lock()
					errors = append(errors, fmt.Sprintf("pod %s: failed to persist metrics: %v", pod.Name, err))
					mu.Unlock()
					return
				}
				mu.Lock()
				allMetrics[pod.Name] = jsonMetrics
				mu.Unlock()
			}(ctx, pod, clusterName)
		}
	}
	wg.Wait()
	if len(allMetrics) == 0 && len(errors) > 0 {
		return nil, errors, fmt.Errorf("failed to scrape metrics from all %s pods", appName)
	}
	return allMetrics, errors, nil
}

func persistMetrics(ctx context.Context, requests chan SaveRequest, appName, podName string, data *db.ParsedData) error {
	if requests == nil {
		return nil
	}

	result := make(chan error, 1)
	select {
	case requests <- SaveRequest{appName: appName, podName: podName, data: data, result: result}:
	case <-ctx.Done():
		return ctx.Err()
	}

	select {
	case err := <-result:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func getMetricsFromHostClusterPod(ctx context.Context, kubeClient kubeclient.Interface, pod db.PodInfo, cfg *db.ComponentConfig) ([]byte, error) {
	if cfg.Scheme == "https" {
		karmadaConfig, _, err := client.GetKarmadaConfig()
		if err != nil {
			return nil, fmt.Errorf("get Karmada client config: %w", err)
		}
		return getAuthenticatedPodMetrics(ctx, karmadaConfig, pod, cfg)
	}
	return getMetricsFromHostClusterPodProxy(ctx, kubeClient, pod.Name, cfg.Port, cfg.MetricsPath)
}

func getMetricsFromHostClusterPodProxy(ctx context.Context, kubeClient kubeclient.Interface, podName, port, metricsPath string) ([]byte, error) {
	path := strings.TrimPrefix(metricsPath, "/")
	metricsOutput, err := kubeClient.CoreV1().RESTClient().Get().
		Namespace(db.Namespace).
		Resource("pods").
		SubResource("proxy").
		Name(fmt.Sprintf("%s:%s", podName, port)).
		Suffix(path).
		Do(ctx).Raw()
	if err == nil {
		return metricsOutput, nil
	}

	// Some apiservers may not reliably handle pod proxy with "<pod>:<port>".
	// Fall back to "<pod>/proxy/metrics" before failing.
	if isPodProxyPortLookupError(err) {
		return kubeClient.CoreV1().RESTClient().Get().
			Namespace(db.Namespace).
			Resource("pods").
			SubResource("proxy").
			Name(podName).
			Suffix(path).
			Do(ctx).Raw()
	}

	return nil, err
}

func getAuthenticatedPodMetrics(ctx context.Context, karmadaConfig *rest.Config, pod db.PodInfo, cfg *db.ComponentConfig) ([]byte, error) {
	if pod.IP == "" {
		return nil, fmt.Errorf("pod has no IP address")
	}

	transportConfig := rest.CopyConfig(karmadaConfig)
	transportConfig.TLSClientConfig.ServerName = cfg.ServerName
	if cfg.InsecureSkipVerify {
		// #nosec G402 -- upstream kube-controller-manager uses an ephemeral
		// self-signed serving certificate; authentication still uses the Karmada
		// client credentials and the connection is restricted to the selected pod.
		transportConfig.TLSClientConfig.Insecure = true
		transportConfig.TLSClientConfig.CAData = nil
		transportConfig.TLSClientConfig.CAFile = ""
		transportConfig.TLSClientConfig.ServerName = ""
	}
	httpClient, err := rest.HTTPClientFor(transportConfig)
	if err != nil {
		return nil, fmt.Errorf("create authenticated metrics client: %w", err)
	}
	httpClient.Timeout = metricsRequestTimeout

	endpoint := url.URL{
		Scheme: cfg.Scheme,
		Host:   net.JoinHostPort(pod.IP, cfg.Port),
		Path:   cfg.MetricsPath,
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create metrics request: %w", err)
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", endpoint.Redacted(), err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("GET %s returned %s: %s", endpoint.Redacted(), resp.Status, strings.TrimSpace(string(body)))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read metrics response from %s: %w", endpoint.Redacted(), err)
	}
	return body, nil
}

func isPodProxyPortLookupError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "could not find the requested resource") ||
		strings.Contains(msg, "not found")
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
		cfg := db.GetComponentConfig(appName)
		if cfg == nil {
			errors = append(errors, fmt.Sprintf("unsupported metrics component %q", appName))
			return podsMap, errors
		}
		pods, err := kubeClient.CoreV1().Pods(db.Namespace).List(ctx, metav1.ListOptions{
			LabelSelector: cfg.LabelSelector,
		})
		if err != nil {
			errors = append(errors, fmt.Sprintf("failed to list pods: %v", err))
			return podsMap, errors
		}

		for _, pod := range pods.Items {
			podsMap[appName] = append(podsMap[appName], db.PodInfo{Name: pod.Name, IP: pod.Status.PodIP})
		}
	}

	return podsMap, errors
}

func getClusterPods(ctx context.Context, cluster *v1alpha1.Cluster) ([]db.PodInfo, error) {
	fmt.Printf("Getting pods for cluster: %s\n", cluster.Name)

	kubeClient := client.InClusterClientForMemberCluster(cluster.Name)
	if kubeClient == nil {
		return nil, fmt.Errorf("failed to create kubeclient for cluster %s", cluster.Name)
	}

	podList, err := kubeClient.CoreV1().Pods("karmada-system").List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", db.KarmadaAgent),
	})
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

func getKarmadaAgentMetrics(ctx context.Context, podName string, clusterName string) (*db.ParsedData, error) {
	if clusterName == "" {
		return nil, fmt.Errorf("cluster name is required for karmada-agent metrics")
	}

	restClient := client.InClusterClientForMemberCluster(clusterName)
	if restClient == nil {
		return nil, fmt.Errorf("failed to create REST client for cluster %s", clusterName)
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

	return parsedData, nil
}
