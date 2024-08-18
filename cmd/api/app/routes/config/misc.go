package config

import (
	 
	"context"
	"fmt"
	"log"
 	"bytes"
	 "io"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	corev1 "k8s.io/api/core/v1" 
 	"k8s.io/apimachinery/pkg/runtime/serializer/json"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/yaml"
)

const (
	namespace  = "karmada-system"
)

func GetRunningapps() ([]string, error) {
	kubeClient := client.InClusterClient()
	pods, err := kubeClient.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		log.Printf("Error listing apps: %v", err)
		return nil, fmt.Errorf("error listing apps")
	}

	labelSet := make(map[string]struct{}, len(pods.Items))
	for _, pod := range pods.Items {
		if appLabel, exists := pod.Labels["app"]; exists {
			labelSet[appLabel] = struct{}{}
		}
	}

	if len(labelSet) == 0 {
		return nil, fmt.Errorf("no Apps found")
	}

	uniquePodLabels := make([]string, 0, len(labelSet))
	for label := range labelSet {
		uniquePodLabels = append(uniquePodLabels, label)
	}

	return uniquePodLabels, nil
}

func GetMetaData(appLabel string) ([]v1.PodMetadata, error) {
	kubeClient := client.InClusterClient()
	pods, err := kubeClient.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", appLabel),
	})
	if err != nil {
		log.Printf("Error listing pods: %v", err)
		return nil, fmt.Errorf("error listing pods")
	}

	var podMetadataList []v1.PodMetadata
	for _, pod := range pods.Items {
		podMetadata := v1.PodMetadata{
			UID:               string(pod.UID),
			CreationTimestamp: pod.CreationTimestamp.String(),
			GenerateName:      pod.GenerateName,
			Labels:            pod.Labels,
			Name:              pod.Name,
		}
		podMetadataList = append(podMetadataList, podMetadata)
	}

	if len(podMetadataList) == 0 {
		return nil, fmt.Errorf("no pods found with app label: %s", appLabel)
	}

	return podMetadataList, nil
}

func GetDeploymentStatus(deploymentName string) (string, error) {
	kubeClient := client.InClusterClient()
	deployment, err := kubeClient.AppsV1().Deployments(namespace).Get(context.TODO(), deploymentName, metav1.GetOptions{})
	if err != nil {
		log.Printf("Error getting deployment: %v", err)
		return "", fmt.Errorf("error getting deployment")
	}

	if deployment.Status.Replicas == deployment.Status.AvailableReplicas {
 
		return fmt.Sprintf("Deployment '%s' successfully rolled out", deploymentName), nil
	}
	return fmt.Sprintf("Deployment '%s' is not fully rolled out", deploymentName), nil
}

func RestartDeployment(deploymentName string) (string, error) {
	kubeClient := client.InClusterClient()

	deployment, err := kubeClient.AppsV1().Deployments(namespace).Get(context.TODO(), deploymentName, metav1.GetOptions{})
	if err != nil {
		log.Printf("Error getting deployment: %v", err)
		return "", fmt.Errorf("error getting deployment")
	}
	_, err = kubeClient.AppsV1().Deployments(namespace).Update(context.TODO(), deployment, metav1.UpdateOptions{})
	if err != nil {
		log.Printf("Error restarting deployment: %v", err)
		return "", fmt.Errorf("error restarting deployment")
	}

	return fmt.Sprintf("Deployment '%s' restarted successfully", deploymentName), nil
}

func DeletePod(podName string) (string, error) {
	kubeClient := client.InClusterClient()

	err := kubeClient.CoreV1().Pods(namespace).Delete(context.TODO(), podName, metav1.DeleteOptions{})
	if err != nil {
		log.Printf("Error deleting pod: %v", err)
		return "", fmt.Errorf("error deleting pod")
	}

	return fmt.Sprintf("Pod '%s' deleted successfully", podName), nil
}

func GetPodLogs(podName string) (string, error) {
    kubeClient := client.InClusterClient()
    logOptions := &corev1.PodLogOptions{}
    req := kubeClient.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
    podLogs, err := req.Stream(context.TODO())
    if err != nil {
        return "", fmt.Errorf("error getting pod logs: %v", err)
    }
    defer podLogs.Close()
    buf := new(bytes.Buffer)
    _, err = io.Copy(buf, podLogs)
    if err != nil {
        return "", fmt.Errorf("error reading pod logs: %v", err)
    }

    return buf.String(), nil
}

func GetPodYAML(podName string) (string, error) {
	kubeClient := client.InClusterClient()
	pod, err := kubeClient.CoreV1().Pods(namespace).Get(context.TODO(), podName, metav1.GetOptions{})
	if err != nil {
		log.Printf("Error getting pod: %v", err)
		return "", fmt.Errorf("error getting pod")
	}
	pod.TypeMeta.Kind = "Pod"
	pod.TypeMeta.APIVersion = "v1"
	scheme := runtime.NewScheme()
	serializer := json.NewYAMLSerializer(json.DefaultMetaFactory, scheme, scheme)
	buf := new(bytes.Buffer)
	err = serializer.Encode(pod, buf)
	if err != nil {
		return "", fmt.Errorf("error encoding pod to YAML: %v", err)
	}

	return buf.String(), nil
}


func UpdatePodYAML(podName string, yamlContent string) (string, error) {
    ctx := context.TODO()
    kubeClient := client.InClusterClient()

    var newPod corev1.Pod
    if err := yaml.Unmarshal([]byte(yamlContent), &newPod); err != nil {
        return "", fmt.Errorf("failed to unmarshal Pod: %v", err)
    }

    oldPod, err := kubeClient.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
    if err != nil {
        return "", fmt.Errorf("failed to get existing Pod: %v", err)
    }
    newPod.TypeMeta = oldPod.TypeMeta
    newPod.ObjectMeta = oldPod.ObjectMeta

    _, err = kubeClient.CoreV1().Pods(namespace).Update(ctx, &newPod, metav1.UpdateOptions{})
    if err != nil {
        return "", fmt.Errorf("failed to update Pod: %v", err)
    }

    // Return success message
    successMessage := fmt.Sprintf("Pod '%s' in namespace '%s' successfully updated", podName, namespace)
    fmt.Printf("Update successful: %s\n", successMessage)
    return successMessage, nil
}
