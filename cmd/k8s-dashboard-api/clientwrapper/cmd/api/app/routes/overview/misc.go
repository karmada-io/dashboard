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

package overview

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"math/big"
	"strings"

	"github.com/karmada-io/karmada/pkg/version"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/dataselect"
	"github.com/karmada-io/dashboard/pkg/resource/cluster"
)

const (
	namespace = "karmada-system"
	app       = "karmada-controller-manager"
)

// GetControllerManagerVersionInfo returns the version info of karmada-controller-manager.
func GetControllerManagerVersionInfo() (*version.Info, error) {
	kubeClient := client.InClusterClient()
	restConfig, _, err := client.GetKubeConfig()
	if err != nil {
		return nil, err
	}
	labelSelector := labels.Set{"app": app}
	podListResult, err := kubeClient.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector.String(),
	})
	if err != nil {
		return nil, err
	}
	if len(podListResult.Items) == 0 {
		return nil, errors.New("no valid pod for karmada-controller-manager")
	}
	nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(podListResult.Items))))
	if err != nil {
		return nil, err
	}
	pod := podListResult.Items[int(nBig.Int64())]

	req := kubeClient.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(pod.Name).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Command:   []string{"karmada-controller-manager", "version"},
			Container: app,
			Stdin:     false,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)
	executor, err := remotecommand.NewSPDYExecutor(restConfig, "POST", req.URL())
	if err != nil {
		return nil, err
	}
	var stdout, stderr bytes.Buffer
	err = executor.StreamWithContext(context.TODO(), remotecommand.StreamOptions{
		Stdout: &stdout,
		Stderr: &stderr,
		Tty:    false,
	})
	if err != nil {
		return nil, err
	}
	parseVersion := ParseVersion(stdout.String())
	return parseVersion, nil
}

// ParseVersion parses the version string to version.Info.
func ParseVersion(versionStr string) *version.Info {
	versionInfo := &version.Info{}
	leftBraceIdx := strings.IndexByte(versionStr, '{')
	rightBraceIdx := strings.IndexByte(versionStr, '}')
	if leftBraceIdx == -1 || rightBraceIdx == -1 {
		return versionInfo
	}
	content := versionStr[leftBraceIdx+1 : rightBraceIdx]
	contentMap := make(map[string]string)
	for _, kvStr := range strings.Split(content, ",") {
		items := strings.SplitN(strings.TrimSpace(kvStr), ":", 2)
		if len(items) < 2 {
			continue
		}
		contentMap[items[0]] = items[1]
	}
	for k, v := range contentMap {
		switch k {
		case "GitVersion":
			versionInfo.GitVersion = strings.Trim(v, "\"")
		case "GitTreeState":
			versionInfo.GitTreeState = strings.Trim(v, "\"")
		case "GitCommit":
			versionInfo.GitCommit = strings.Trim(v, "\"")
		case "BuildDate":
			versionInfo.BuildDate = strings.Trim(v, "\"")
		case "GoVersion":
			versionInfo.GoVersion = strings.Trim(v, "\"")
		case "Platform":
			versionInfo.Platform = strings.Trim(v, "\"")
		case "Compiler":
			versionInfo.Compiler = strings.Trim(v, "\"")
		}
	}
	return versionInfo
}

// GetControllerManagerInfo returns the version info of karmada-controller-manager.
func GetControllerManagerInfo() (*v1.KarmadaInfo, error) {
	versionInfo, err := GetControllerManagerVersionInfo()
	if err != nil {
		return nil, err
	}

	kubeClient := client.InClusterClient()
	ret, err := kubeClient.AppsV1().Deployments("karmada-system").Get(context.TODO(), "karmada-controller-manager", metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	// fmt.Println(ret.CreationTimestamp.Format("2006-01-02 15:04:05"))
	karmadaInfo := &v1.KarmadaInfo{
		Version:    versionInfo,
		Status:     "",
		CreateTime: ret.CreationTimestamp,
	}
	if *ret.Spec.Replicas == ret.Status.AvailableReplicas {
		karmadaInfo.Status = "running"
	} else {
		karmadaInfo.Status = "unknown"
	}

	return karmadaInfo, nil
}

// GetMemberClusterInfo returns the status of member clusters.
func GetMemberClusterInfo(ds *dataselect.DataSelectQuery) (*v1.MemberClusterStatus, error) {
	karmadaClient := client.InClusterKarmadaClient()
	result, err := cluster.GetClusterList(karmadaClient, ds)
	if err != nil {
		return nil, err
	}
	memberClusterStatus := &v1.MemberClusterStatus{
		NodeSummary:   &v1.NodeSummary{},
		CPUSummary:    &v1.CPUSummary{},
		MemorySummary: &v1.MemorySummary{},
		PodSummary:    &v1.PodSummary{},
	}
	for _, clusterItem := range result.Clusters {
		// handle node summary
		memberClusterStatus.NodeSummary.ReadyNum += clusterItem.NodeSummary.ReadyNum
		memberClusterStatus.NodeSummary.TotalNum += clusterItem.NodeSummary.TotalNum

		// handle cpu summary
		memberClusterStatus.CPUSummary.TotalCPU += clusterItem.AllocatedResources.CPUCapacity
		memberClusterStatus.CPUSummary.AllocatedCPU += float64(clusterItem.AllocatedResources.CPUCapacity) * clusterItem.AllocatedResources.CPUFraction / 100

		// handle memory summary
		memberClusterStatus.MemorySummary.TotalMemory += clusterItem.AllocatedResources.MemoryCapacity
		memberClusterStatus.MemorySummary.AllocatedMemory += float64(clusterItem.AllocatedResources.MemoryCapacity) * clusterItem.AllocatedResources.MemoryFraction / 100

		// handle pod summary
		memberClusterStatus.PodSummary.TotalPod += clusterItem.AllocatedResources.PodCapacity
		memberClusterStatus.PodSummary.AllocatedPod += clusterItem.AllocatedResources.AllocatedPods
	}
	return memberClusterStatus, nil
}

// GetClusterResourceStatus returns the status of cluster resources.
func GetClusterResourceStatus() (*v1.ClusterResourceStatus, error) {
	clusterResourceStatus := &v1.ClusterResourceStatus{}
	ctx := context.TODO()
	karmadaClient := client.InClusterKarmadaClient()
	// handle pp num
	clusterPPRet, err := karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.PropagationPolicyNum += len(clusterPPRet.Items)

	ppRet, err := karmadaClient.PolicyV1alpha1().PropagationPolicies("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.PropagationPolicyNum += len(ppRet.Items)

	// handle op num
	clusterOPRet, err := karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.OverridePolicyNum += len(clusterOPRet.Items)

	opRet, err := karmadaClient.PolicyV1alpha1().OverridePolicies("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.OverridePolicyNum += len(opRet.Items)

	// handle cluster resources
	// handler namespace num
	kubeClient := client.InClusterClientForKarmadaAPIServer()
	nsRet, err := kubeClient.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.NamespaceNum += len(nsRet.Items)

	// handle workload num
	// currently only deployment is allowed
	deploymentRet, err := kubeClient.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.WorkloadNum += len(deploymentRet.Items)

	// handle configmap & secret num
	secretRet, err := kubeClient.CoreV1().Secrets("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.ConfigNum += len(secretRet.Items)
	cmRet, err := kubeClient.CoreV1().ConfigMaps("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.ConfigNum += len(cmRet.Items)

	// handle service & ingress num
	svcRet, err := kubeClient.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.ServiceNum += len(svcRet.Items)
	ingressRet, err := kubeClient.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	clusterResourceStatus.ServiceNum += len(ingressRet.Items)

	return clusterResourceStatus, nil
}
