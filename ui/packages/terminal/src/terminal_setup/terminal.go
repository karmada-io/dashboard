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


package terminal_setup  // Use package main to indicate this is an executable file

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"  // Added import for filepath
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/apimachinery/pkg/util/wait"
	//"github.com/golang-jwt/jwt/v5"

)

import (
	//"strings" // Added import for strings
	//"net/http"
	"github.com/gin-gonic/gin"
	//"encoding/base64"
	//"github.com/karmada-io/dashboard/pkg/client"
)

// Initialize the Kubernetes client
func getClientSet() (*kubernetes.Clientset, error) {
	// Fetch the KUBECONFIG environment variable
	kubeconfigPath := os.Getenv("KUBECONFIG")
	
	// If KUBECONFIG is not set, use the default path based on the OS
	if kubeconfigPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get user home directory: %v", err)
		}
		
		// For Unix-like systems (Linux/Mac), default path is ~/.kube/karmada.config
		// For Windows, default path is C:\Users\<User>\.kube\karmada.config
		kubeconfigPath = filepath.Join(homeDir, ".kube", "karmada.config")
	}

	// Create the Kubernetes client configuration using the kubeconfig file
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("error creating kubeconfig: %v", err)
	}

	// Create a Kubernetes client based on the configuration
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("error creating Kubernetes client: %v", err)
	}

	return clientset, nil
}



func applyTtydPod(clientset *kubernetes.Clientset) error {
    // Construct the relative path to the ttyd-pod.yaml
    ttydPodPath := "artifacts/dashboard/ttyd-pod.yaml"

    // Run kubectl apply command
    cmd := []string{"kubectl", "apply", "-f", ttydPodPath}
    out, err := exec.Command(cmd[0], cmd[1:]...).CombinedOutput()
    
    if err != nil {
        log.Printf("Kubectl apply failed: %v", err)
        log.Printf("Kubectl output: %s", out) // Log the output to debug
        return fmt.Errorf("failed to apply ttyd pod YAML: %v", err)
    }
    
    log.Printf("Kubectl apply output: %s", out) // Log successful output from kubectl
    return nil
}



func waitForPod(clientset *kubernetes.Clientset, podName, namespace string) error {
    // Get the pod immediately without waiting
    pod, err := clientset.CoreV1().Pods(namespace).Get(context.TODO(), podName, metav1.GetOptions{})
    if err != nil {
        return fmt.Errorf("failed to get pod: %v", err)
    }

    // Check if the pod is already running
    if pod.Status.Phase == "Running" {
        log.Println("Pod is running.")
        return nil
    }

    // If not running, start polling
    err = wait.Poll(2*time.Second, 2*time.Minute, func() (bool, error) {
        pod, err := clientset.CoreV1().Pods(namespace).Get(context.TODO(), podName, metav1.GetOptions{})
        if err != nil {
            return false, err
        }
        if pod.Status.Phase == "Running" {
            return true, nil
        }
        return false, nil
    })
    return err
}


// Execute a command in the ttyd pod (e.g., mkdir and chmod)
func execIntoPod(clientset *kubernetes.Clientset, podName, namespace, command string) error {
	cmd := []string{"kubectl", "exec", "-it", podName, "-n", namespace, "--", "sh", "-c", command}
	err := exec.Command(cmd[0], cmd[1:]...).Run()
	return err
}

// Copy the kubeconfig.yaml into the pod
func copyKubeConfigToPod(clientset *kubernetes.Clientset, podName, namespace, kubeConfigPath string) error {
	cmd := []string{"kubectl", "cp", kubeConfigPath, fmt.Sprintf("%s/%s:/home/ttyd/.kube/config", namespace, podName)}
	err := exec.Command(cmd[0], cmd[1:]...).Run()
	return err
}

// Port-forward to the ttyd Pod
func portForwardPod(clientset *kubernetes.Clientset, podName, namespace string) error {
	cmd := []string{"kubectl", "port-forward", fmt.Sprintf("pod/%s", podName), "7681:7681", "-n", namespace}
	err := exec.Command(cmd[0], cmd[1:]...).Run()
	return err
}

// Main terminal setup function
func TriggerTerminal(c *gin.Context) {
	clientset, err := getClientSet()
	kubeConfigPath := filepath.Join("artifacts", "dashboard", "kubeconfig.yaml")
	if err != nil {
		log.Fatalf("Error initializing Kubernetes client: %v", err)
	}


	// Apply ttyd Pod YAML
	err = applyTtydPod(clientset)
	if err != nil {
		log.Fatalf("Failed to apply ttyd pod YAML: %v", err)
	}

	// Wait for pod to be in running state
	podName := "ttyd-cbf14e3f-f53a-4e0c-99e2-b39ebc0d221d" // Adjust this based on your pod name
	namespace := "karmada-system"
	err = waitForPod(clientset, podName, namespace)
	if err != nil {
		log.Fatalf("Failed to wait for pod: %v", err)
	}

	// Create the .kube directory and set permissions
	err = execIntoPod(clientset, podName, namespace, "mkdir -p /home/ttyd/.kube")
	if err != nil {
		log.Fatalf("Failed to create .kube directory: %v", err)
	}

	// Set correct permissions
	err = execIntoPod(clientset, podName, namespace, "chmod 700 /home/ttyd/.kube")
	if err != nil {
		log.Fatalf("Failed to set permissions for .kube directory: %v", err)
	}

	// Copy the kubeconfig.yaml into the container
	//kubeConfigPath := filepath.Join("..", "..", "..", "..", "..", "artifacts", "dashboard", "kubeconfig.yaml")
	err = copyKubeConfigToPod(clientset, podName, namespace, kubeConfigPath)
	if err != nil {
		log.Fatalf("Failed to copy kubeconfig.yaml: %v", err)
	}

	// Port-forward the ttyd pod to expose the terminal
	err = portForwardPod(clientset, podName, namespace)
	if err != nil {
		log.Fatalf("Failed to port-forward ttyd pod: %v", err)
	}
	// For example, sending a success message
	c.JSON(200, gin.H{"message": "Terminal setup initiated successfully"})
	//fmt.Fprintf(w, "Terminal setup initiated successfully")
	//log.Println("Terminal is now available at http://127.0.0.1:7681")
	
}