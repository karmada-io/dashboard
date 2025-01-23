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

package cluster

import (
	"context"
	"fmt"
	"time"

	clusterv1alpha1 "github.com/karmada-io/karmada/pkg/apis/cluster/v1alpha1"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	cmdutil "github.com/karmada-io/karmada/pkg/karmadactl/util"
	karmadautil "github.com/karmada-io/karmada/pkg/util"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubeclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/klog/v2"
)

const (
	// KarmadaKubeconfigName is the name of karmada kubeconfig
	KarmadaKubeconfigName = "karmada-kubeconfig"
	// KarmadaAgentServiceAccountName is the name of karmada-agent serviceaccount
	KarmadaAgentServiceAccountName = "karmada-agent-sa"
	// KarmadaAgentName is the name of karmada-agent
	KarmadaAgentName = "karmada-agent"
	// KarmadaAgentImage is the image of karmada-agent
	KarmadaAgentImage = "karmada/karmada-agent:latest"
	// ClusterNamespace is the namespace of cluster
	ClusterNamespace = "karmada-cluster"
)

var (
	karmadaAgentLabels   = map[string]string{"app": KarmadaAgentName}
	karmadaAgentReplicas = int32(2)
	timeout              = 5 * time.Minute
)

type pullModeOption struct {
	karmadaClient          karmadaclientset.Interface
	karmadaAgentCfg        *clientcmdapi.Config
	memberClusterNamespace string
	memberClusterClient    *kubeclient.Clientset
	memberClusterName      string
	memberClusterEndpoint  string
}

// createSecretAndRBACInMemberCluster create required secrets and rbac in member cluster
func (o pullModeOption) createSecretAndRBACInMemberCluster() error {
	configBytes, err := clientcmd.Write(*o.karmadaAgentCfg)
	if err != nil {
		return fmt.Errorf("failure while serializing karmada-agent kubeConfig. %w", err)
	}

	kubeConfigSecret := &corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Secret",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      KarmadaKubeconfigName,
			Namespace: o.memberClusterNamespace,
		},
		Type:       corev1.SecretTypeOpaque,
		StringData: map[string]string{KarmadaKubeconfigName: string(configBytes)},
	}

	// create karmada-kubeconfig secret to be used by karmada-agent component.
	if err := cmdutil.CreateOrUpdateSecret(o.memberClusterClient, kubeConfigSecret); err != nil {
		return fmt.Errorf("create secret %s failed: %v", kubeConfigSecret.Name, err)
	}

	clusterRole := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name: KarmadaAgentName,
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
			{
				NonResourceURLs: []string{"*"},
				Verbs:           []string{"get"},
			},
		},
	}

	// create a karmada-agent ClusterRole in member cluster.
	if err := cmdutil.CreateOrUpdateClusterRole(o.memberClusterClient, clusterRole); err != nil {
		return err
	}

	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      KarmadaAgentServiceAccountName,
			Namespace: o.memberClusterNamespace,
		},
	}

	// create service account for karmada-agent
	_, err = karmadautil.EnsureServiceAccountExist(o.memberClusterClient, sa, false)
	if err != nil {
		return err
	}

	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: KarmadaAgentName,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRole.Name,
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      sa.Name,
				Namespace: sa.Namespace,
			},
		},
	}

	// grant karmada-agent clusterrole to karmada-agent service account
	if err := cmdutil.CreateOrUpdateClusterRoleBinding(o.memberClusterClient, clusterRoleBinding); err != nil {
		return err
	}

	return nil
}

// makeKarmadaAgentDeployment generate karmada-agent Deployment
func (o pullModeOption) makeKarmadaAgentDeployment() *appsv1.Deployment {
	karmadaAgent := &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      KarmadaAgentName,
			Namespace: o.memberClusterNamespace,
			Labels:    karmadaAgentLabels,
		},
	}

	//controllers := []string{"*"}
	podSpec := corev1.PodSpec{
		ImagePullSecrets: []corev1.LocalObjectReference{
			{
				Name: "fronted-cn-beijing",
			},
		},
		ServiceAccountName: KarmadaAgentServiceAccountName,
		Containers: []corev1.Container{
			{
				Name:  KarmadaAgentName,
				Image: KarmadaAgentImage,
				Command: []string{
					"/bin/karmada-agent",
					"--karmada-kubeconfig=/etc/kubeconfig/karmada-kubeconfig",
					fmt.Sprintf("--cluster-name=%s", o.memberClusterName),
					fmt.Sprintf("--cluster-api-endpoint=%s", o.memberClusterEndpoint),
					//fmt.Sprintf("--cluster-provider=%s", clusterProvider),
					//fmt.Sprintf("--cluster-region=%s", clusterRegion),
					//fmt.Sprintf("--cluster-zones=%s", strings.Join(clusterZones, ",")),
					//fmt.Sprintf("--controllers=%s", strings.Join(controllers, ",")),
					//fmt.Sprintf("--proxy-server-address=%s", proxyServerAddress),
					//fmt.Sprintf("--leader-elect-resource-namespace=%s", o.memberClusterNamespace),
					fmt.Sprintf("--feature-gates=CustomizedClusterResourceModeling=true,MultiClusterService=true"),
					"--cluster-status-update-frequency=10s",
					"--bind-address=0.0.0.0",
					"--secure-port=10357",
					"--v=4",
				},
				VolumeMounts: []corev1.VolumeMount{
					{
						Name:      "kubeconfig",
						MountPath: "/etc/kubeconfig",
					},
				},
			},
		},
		Volumes: []corev1.Volume{
			{
				Name: "kubeconfig",
				VolumeSource: corev1.VolumeSource{
					Secret: &corev1.SecretVolumeSource{
						SecretName: KarmadaKubeconfigName,
					},
				},
			},
		},
		Tolerations: []corev1.Toleration{
			{
				Key:      "node-role.kubernetes.io/master",
				Operator: corev1.TolerationOpExists,
			},
		},
	}
	// PodTemplateSpec
	podTemplateSpec := corev1.PodTemplateSpec{
		ObjectMeta: metav1.ObjectMeta{
			Name:      KarmadaAgentName,
			Namespace: o.memberClusterNamespace,
			Labels:    karmadaAgentLabels,
		},
		Spec: podSpec,
	}
	// DeploymentSpec
	karmadaAgent.Spec = appsv1.DeploymentSpec{
		Replicas: &karmadaAgentReplicas,
		Template: podTemplateSpec,
		Selector: &metav1.LabelSelector{
			MatchLabels: karmadaAgentLabels,
		},
	}

	return karmadaAgent
}

func accessClusterInPullMode(opts *pullModeOption) error {
	_, exist, err := karmadautil.GetClusterWithKarmadaClient(opts.karmadaClient, opts.memberClusterName)
	if err != nil {
		return err
	}
	if exist {
		return fmt.Errorf("failed to register as cluster with name %s already exists", opts.memberClusterName)
	}
	// It's necessary to set the label of namespace to make sure that the namespace is created by Karmada.
	labels := map[string]string{
		karmadautil.ManagedByKarmadaLabel: karmadautil.ManagedByKarmadaLabelValue,
	}
	// ensure namespace where the karmada-agent resources be deployed exists in the member cluster
	if _, err = karmadautil.EnsureNamespaceExistWithLabels(opts.memberClusterClient, opts.memberClusterNamespace, false, labels); err != nil {
		return err
	}
	if err = opts.createSecretAndRBACInMemberCluster(); err != nil {
		return err
	}
	karmadaAgentDeployment := opts.makeKarmadaAgentDeployment()
	if _, err = opts.memberClusterClient.AppsV1().Deployments(opts.memberClusterNamespace).Create(context.TODO(), karmadaAgentDeployment, metav1.CreateOptions{}); err != nil {
		return err
	}
	// TODO: deployment ready cannot exactly express that cluster is ready
	// It should also check cluster resource on karmada control-plane
	// maybe karmadactl should optimized it
	if err = cmdutil.WaitForDeploymentRollout(opts.memberClusterClient, karmadaAgentDeployment, int(timeout)); err != nil {
		return err
	}
	return nil
}

type pushModeOption struct {
	karmadaClient           karmadaclientset.Interface
	clusterName             string
	karmadaRestConfig       *rest.Config
	memberClusterRestConfig *rest.Config
}

func accessClusterInPushMode(opts *pushModeOption) error {
	registerOption := karmadautil.ClusterRegisterOption{
		ClusterNamespace:   ClusterNamespace,
		ClusterName:        opts.clusterName,
		ReportSecrets:      []string{karmadautil.KubeCredentials, karmadautil.KubeImpersonator},
		ControlPlaneConfig: opts.karmadaRestConfig,
		ClusterConfig:      opts.memberClusterRestConfig,
	}

	controlPlaneKubeClient := kubeclient.NewForConfigOrDie(opts.karmadaRestConfig)
	memberClusterKubeClient := kubeclient.NewForConfigOrDie(opts.memberClusterRestConfig)
	id, err := karmadautil.ObtainClusterID(memberClusterKubeClient)
	if err != nil {
		klog.ErrorS(err, "ObtainClusterID failed")
		return err
	}
	exist, name, err := karmadautil.IsClusterIdentifyUnique(opts.karmadaClient, id)
	if err != nil {
		klog.ErrorS(err, "Check ClusterIdentify failed")
		return err
	}
	if !exist {
		return fmt.Errorf("the same cluster has been registered with name %s", name)
	}
	registerOption.ClusterID = id

	clusterSecret, impersonatorSecret, err := karmadautil.ObtainCredentialsFromMemberCluster(memberClusterKubeClient, registerOption)
	if err != nil {
		klog.ErrorS(err, "ObtainCredentialsFromMemberCluster failed")
		return err
	}
	registerOption.Secret = *clusterSecret
	registerOption.ImpersonatorSecret = *impersonatorSecret

	err = karmadautil.RegisterClusterInControllerPlane(registerOption, controlPlaneKubeClient, generateClusterInControllerPlane)
	if err != nil {
		return err
	}
	klog.Infof("cluster(%s) is joined successfully\n", opts.clusterName)
	return nil
}

func generateClusterInControllerPlane(opts karmadautil.ClusterRegisterOption) (*clusterv1alpha1.Cluster, error) {
	clusterObj := &clusterv1alpha1.Cluster{}
	clusterObj.Name = opts.ClusterName
	clusterObj.Spec.SyncMode = clusterv1alpha1.Push
	clusterObj.Spec.APIEndpoint = opts.ClusterConfig.Host
	clusterObj.Spec.ID = opts.ClusterID
	clusterObj.Spec.SecretRef = &clusterv1alpha1.LocalSecretReference{
		Namespace: opts.Secret.Namespace,
		Name:      opts.Secret.Name,
	}
	clusterObj.Spec.ImpersonatorSecretRef = &clusterv1alpha1.LocalSecretReference{
		Namespace: opts.ImpersonatorSecret.Namespace,
		Name:      opts.ImpersonatorSecret.Name,
	}

	if opts.ClusterProvider != "" {
		clusterObj.Spec.Provider = opts.ClusterProvider
	}

	if len(opts.ClusterZones) > 0 {
		clusterObj.Spec.Zones = opts.ClusterZones
	}

	if opts.ClusterRegion != "" {
		clusterObj.Spec.Region = opts.ClusterRegion
	}

	clusterObj.Spec.InsecureSkipTLSVerification = opts.ClusterConfig.TLSClientConfig.Insecure

	if opts.ClusterConfig.Proxy != nil {
		url, err := opts.ClusterConfig.Proxy(nil)
		if err != nil {
			return nil, fmt.Errorf("clusterConfig.Proxy error, %v", err)
		}
		clusterObj.Spec.ProxyURL = url.String()
	}

	controlPlaneKarmadaClient := karmadaclientset.NewForConfigOrDie(opts.ControlPlaneConfig)
	cluster, err := karmadautil.CreateClusterObject(controlPlaneKarmadaClient, clusterObj)
	if err != nil {
		return nil, fmt.Errorf("failed to create cluster(%s) object. error: %v", opts.ClusterName, err)
	}

	return cluster, nil
}
