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

package terminal

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/utils/ptr"

	"github.com/karmada-io/dashboard/cmd/api/app/routes/auth"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
)

// waitForPodReady polls until the Pod is Running and Ready, or times out.
func waitForPodReady(ctx context.Context, clientset kubernetes.Interface, namespace, podName string) error {
	return wait.PollUntilContextTimeout(
		ctx,
		5*time.Second,
		5*time.Minute,
		true,
		func(ctx context.Context) (bool, error) {
			pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
			if err != nil {
				return false, err
			}
			if pod.Status.Phase != corev1.PodRunning {
				return false, nil
			}
			for _, cond := range pod.Status.Conditions {
				if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
					return true, nil
				}
			}
			return false, nil
		},
	)
}

func createTTYdPod(ctx context.Context, clientset kubernetes.Interface, user *v1.User) (*corev1.Pod, error) {
	userName := user.Name
	if userName == "" {
		userName = "default"
	}
	podName := fmt.Sprintf("dashboard-tty-%s", userName)
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			// GenerateName: "ttyd-",
			Name:      podName,
			Namespace: "karmada-system",
			Labels:    map[string]string{"app": "dashboard-ttyd"},
		},
		Spec: corev1.PodSpec{
			SecurityContext: &corev1.PodSecurityContext{
				FSGroup: ptr.To(int64(0)),
			},
			ServiceAccountName: "default",
			DNSPolicy:          corev1.DNSClusterFirst,
			EnableServiceLinks: ptr.To(true),
			Volumes: []corev1.Volume{
				{
					Name: "kube-api-access",
					VolumeSource: corev1.VolumeSource{Projected: &corev1.ProjectedVolumeSource{
						DefaultMode: ptr.To(int32(420)),
						Sources: []corev1.VolumeProjection{
							{ServiceAccountToken: &corev1.ServiceAccountTokenProjection{Path: "token", ExpirationSeconds: ptr.To(int64(3607))}},
							{ConfigMap: &corev1.ConfigMapProjection{LocalObjectReference: corev1.LocalObjectReference{Name: "kube-root-ca.crt"}, Items: []corev1.KeyToPath{{Key: "ca.crt", Path: "ca.crt"}}}},
							{DownwardAPI: &corev1.DownwardAPIProjection{Items: []corev1.DownwardAPIVolumeFile{{Path: "namespace", FieldRef: &corev1.ObjectFieldSelector{FieldPath: "metadata.namespace"}}}}},
						},
					}},
				},
				{
					Name: "kubeconfig-dir", // Volume for /home/ttyd/.kube
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				},
			},

			Containers: []corev1.Container{
				{
					Name:            "ttyd",
					Image:           "karmada/karmada-dashboard-terminal:latest",
					ImagePullPolicy: corev1.PullIfNotPresent,
					//  ◀️ Set this per‑container
					SecurityContext: &corev1.SecurityContext{
						RunAsUser:  ptr.To(int64(0)),
						RunAsGroup: ptr.To(int64(0)),
					},

					Ports: []corev1.ContainerPort{
						{ContainerPort: 7681, Name: "tcp", Protocol: corev1.ProtocolTCP},
					},
					LivenessProbe: &corev1.Probe{
						ProbeHandler: corev1.ProbeHandler{
							TCPSocket: &corev1.TCPSocketAction{Port: intstr.FromInt32(7681)},
						},
						InitialDelaySeconds: 5,
						PeriodSeconds:       10,
						TimeoutSeconds:      1,
						SuccessThreshold:    1,
						FailureThreshold:    3,
					},
					ReadinessProbe: &corev1.Probe{
						ProbeHandler: corev1.ProbeHandler{
							TCPSocket: &corev1.TCPSocketAction{Port: intstr.FromInt32(7681)},
						},
						InitialDelaySeconds: 5,
						PeriodSeconds:       10,
						TimeoutSeconds:      1,
						SuccessThreshold:    1,
						FailureThreshold:    3,
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "kube-api-access",
							MountPath: "/var/run/secrets/kubernetes.io/serviceaccount",
							ReadOnly:  true,
						},
						{
							Name:      "kubeconfig-dir",   // mount the EmptyDir volume
							MountPath: "/home/ttyd/.kube", // into the .kube dir
						},
					},
				},
			},
			RestartPolicy: corev1.RestartPolicyAlways,
		},
	}

	getResp, err := clientset.CoreV1().Pods(pod.Namespace).Get(ctx, podName, metav1.GetOptions{})
	if err == nil {
		return getResp, nil
	}

	created, err := clientset.CoreV1().Pods(pod.Namespace).Create(ctx, pod, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create ttyd Pod: %w", err)
	}

	// ✅ Merge-patch just the label (no race on resourceVersion)
	patch := []byte(fmt.Sprintf(`{"metadata":{"labels":{"pod-name":"%s"}}}`, created.Name))
	if _, err := clientset.CoreV1().
		Pods(created.Namespace).
		Patch(ctx, created.Name, types.MergePatchType, patch, metav1.PatchOptions{}); err != nil {
		return nil, fmt.Errorf("failed to patch pod with pod-name: %w", err)
	}

	// Wait for Pod to be ready
	fmt.Println("Waiting for Pod to become Ready...")
	if err := waitForPodReady(ctx, clientset, created.Namespace, created.Name); err != nil {
		return nil, fmt.Errorf("pod did not become ready: %w", err)
	}
	fmt.Printf("✅ Pod %s is ready\n", created.Name)
	return created, nil
}

// GenerateKubeConfig builds an in-memory kubeconfig with the provided token.
func GenerateKubeConfig(token string) ([]byte, error) {
	cfg := clientcmdapi.Config{
		APIVersion: "v1",
		Kind:       "Config",
		Clusters: map[string]*clientcmdapi.Cluster{
			"karmada-apiserver": {
				Server:                "https://karmada-apiserver.karmada-system.svc.cluster.local:5443",
				InsecureSkipTLSVerify: true,
			},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			"karmada-apiserver": {
				Token: token, // Use the passed token for authentication
			},
		},
		Contexts: map[string]*clientcmdapi.Context{
			"karmada-apiserver": {
				Cluster:  "karmada-apiserver", // Link context to the cluster
				AuthInfo: "karmada-apiserver", // Link context to the user
			},
		},
		CurrentContext: "karmada-apiserver", // Set the current context
	}

	// Write the config to byte array and return
	return clientcmd.Write(cfg)
}

// ExecIntoPodWithInput Inject the kubeconfig into the pod
func ExecIntoPodWithInput(
	ctx context.Context,
	restCfg *rest.Config,
	clientset kubernetes.Interface,
	namespace, podName, containerName string,
	command []string,
	stdinData []byte,
) error {
	req := clientset.CoreV1().
		RESTClient().
		Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(
			&corev1.PodExecOptions{
				Container: containerName,
				Command:   command,
				Stdin:     len(stdinData) > 0,
				Stdout:    true,
				Stderr:    true,
				TTY:       false,
			},
			scheme.ParameterCodec,
		)

	executor, err := remotecommand.NewSPDYExecutor(restCfg, "POST", req.URL())
	if err != nil {
		return fmt.Errorf("failed to init executor: %w", err)
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	execCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	err = executor.StreamWithContext(execCtx, remotecommand.StreamOptions{
		Stdin:  bytes.NewReader(stdinData),
		Stdout: &stdoutBuf,
		Stderr: &stderrBuf,
		Tty:    false,
	})

	if err != nil {
		return fmt.Errorf("exec failed: %w\nSTDOUT:\n%s\nSTDERR:\n%s", err, stdoutBuf.String(), stderrBuf.String())
	}

	if stderrBuf.Len() > 0 {
		fmt.Printf("⚠️ stderr during exec: %s\n", stderrBuf.String())
	}

	return nil
}

// TriggerTerminal handles the HTTP request to set up a ttyd pod and inject kubeconfig.
func TriggerTerminal(c *gin.Context) {
	ctx := c.Request.Context()
	user, _, err := auth.GetCurrentUser(c)
	if err != nil {
		common.Fail(c, fmt.Errorf("failed to getCurrent login user"))
		return
	}

	// 1) Grab Kubernetes REST config and clientset from your shared pkg
	// Load whichever config InitKubeConfig() set up (in‑cluster or local kubeconfig)
	restCfg, _, err := client.GetKubeConfig()
	if err != nil {
		common.Fail(c, fmt.Errorf("failed to load kube config: %w", err))
		return
	}

	// get the clientset
	k8sClient := client.InClusterClient()
	if k8sClient == nil {
		common.Fail(c, fmt.Errorf("failed to initialize Kubernetes client"))
		return
	}

	// 2) Create the ttyd Pod
	pod, err := createTTYdPod(ctx, k8sClient, user)
	if err != nil {
		common.Fail(c, fmt.Errorf("create ttyd pod failed: %w", err))
		return
	}

	// Get pod details
	containerName := pod.Spec.Containers[0].Name

	// Extract the user Bearer token from the request
	authHeader := c.GetHeader("Authorization")
	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	}

	//  Generate an in‑memory kubeconfig for that token
	kubecfgBytes, err := GenerateKubeConfig(token)
	if err != nil {
		common.Fail(c, fmt.Errorf("generate kubeconfig failed: %w", err))
		return
	}

	//  Inject the kubeconfig into the pod via `cat > /home/ttyd/.kube/config`
	if err := ExecIntoPodWithInput(
		ctx, restCfg, k8sClient,
		pod.Namespace, pod.Name, containerName,
		[]string{"sh", "-c", "cat > /home/ttyd/.kube/config"},
		kubecfgBytes,
	); err != nil {
		common.Fail(c, fmt.Errorf("inject kubeconfig failed: %w", err))
		return
	}

	common.Success(c, gin.H{
		"podName":   pod.Name,
		"namespace": pod.Namespace,
		"container": pod.Spec.Containers[0].Name,
	})
}

// TerminalResponse represents the response in WaitForTerminal.
type TerminalResponse struct {
	ID string `json:"id"`
}

func handleExecShell(c *gin.Context) {
	sessionID, err := genTerminalSessionID()
	if err != nil {
		common.Fail(c, err)
		return
	}
	cfg, _, err := client.GetKubeConfig()
	if err != nil {
		common.Fail(c, err)
		return
	}

	terminalSessions.Set(sessionID, TerminalSession{
		id:       sessionID,
		bound:    make(chan error),
		sizeChan: make(chan remotecommand.TerminalSize),
	})

	//restfulRequest := restful.NewRequest(c.Request)
	//go WaitForTerminal(client.InClusterClient(), cfg, restfulRequest, sessionID)
	info := TerminalInfo{
		Shell:         c.Query("shell"),
		Namespace:     c.Param("namespace"),
		PodName:       c.Param("pod"),
		ContainerName: c.Param("container"),
	}
	go WaitForTerminal(client.InClusterClient(), cfg, info, sessionID)
	common.Success(c, TerminalResponse{ID: sessionID})
}
