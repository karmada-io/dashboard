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
	// KarmadaKubeconfigName 是 karmada kubeconfig 的名称
	KarmadaKubeconfigName = "karmada-kubeconfig"
	// KarmadaAgentServiceAccountName is the name of karmada-agent serviceaccount
	// KarmadaAgentServiceAccountName 是 karmada-agent serviceaccount 的名称
	KarmadaAgentServiceAccountName = "karmada-agent-sa"
	// KarmadaAgentName is the name of karmada-agent
	// KarmadaAgentName 是 karmada-agent 的名称
	KarmadaAgentName = "karmada-agent"
	// KarmadaAgentImage is the image of karmada-agent
	// KarmadaAgentImage 是 karmada-agent 的镜像
	KarmadaAgentImage = "karmada/karmada-agent:latest"
	// ClusterNamespace is the namespace of cluster
	// ClusterNamespace 是集群的命名空间
	ClusterNamespace = "karmada-cluster"
)

var (
	// karmadaAgentLabels 是 karmada-agent 的标签
	karmadaAgentLabels   = map[string]string{"app": KarmadaAgentName}
	// karmadaAgentReplicas 是 karmada-agent 的副本数
	karmadaAgentReplicas = int32(2)
	// timeout 是超时时间
	timeout              = 5 * time.Minute
)

// pullModeOption 是拉取模式选项
type pullModeOption struct {
	// karmadaClient 是 karmada 客户端
	karmadaClient          karmadaclientset.Interface
	// karmadaAgentCfg 是 karmada-agent 的配置
	karmadaAgentCfg        *clientcmdapi.Config
	// memberClusterNamespace 是成员集群的命名空间
	memberClusterNamespace string
	// memberClusterClient 是成员集群的客户端
	memberClusterClient    *kubeclient.Clientset
	// memberClusterName 是成员集群的名称
	memberClusterName      string
	// memberClusterEndpoint 是成员集群的端点
	memberClusterEndpoint  string
}

// createSecretAndRBACInMemberCluster 在成员集群中创建所需的秘密和RBAC
func (o pullModeOption) createSecretAndRBACInMemberCluster() error {
	// 序列化 karmada-agent 的 kubeconfig
	configBytes, err := clientcmd.Write(*o.karmadaAgentCfg)
	if err != nil {
		return fmt.Errorf("failure while serializing karmada-agent kubeConfig. %w", err)
	}

	// 创建 karmada-kubeconfig 秘密
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
	// 创建karmada-kubeconfig秘密，供karmada-agent组件使用。
	if err := cmdutil.CreateOrUpdateSecret(o.memberClusterClient, kubeConfigSecret); err != nil {
		return fmt.Errorf("create secret %s failed: %v", kubeConfigSecret.Name, err)
	}

	// 创建 karmada-agent ClusterRole
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
	// 在成员集群中创建karmada-agent ClusterRole。
	if err := cmdutil.CreateOrUpdateClusterRole(o.memberClusterClient, clusterRole); err != nil {
		return err
	}

	// 创建 karmada-agent ServiceAccount
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      KarmadaAgentServiceAccountName,
			Namespace: o.memberClusterNamespace,
		},
	}

	// create service account for karmada-agent
	// 在成员集群中创建karmada-agent ServiceAccount。
	_, err = karmadautil.EnsureServiceAccountExist(o.memberClusterClient, sa, false)
	if err != nil {
		return err
	}

	// 创建 karmada-agent ClusterRoleBinding
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
	// 授予karmada-agent ClusterRole给karmada-agent ServiceAccount。
	if err := cmdutil.CreateOrUpdateClusterRoleBinding(o.memberClusterClient, clusterRoleBinding); err != nil {
		return err
	}

	return nil
}

// makeKarmadaAgentDeployment 生成karmada-agent Deployment
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
					"--feature-gates=CustomizedClusterResourceModeling=true,MultiClusterService=true",
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

// accessClusterInPullMode 在拉取模式下访问集群
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

// pushModeOption 推送模式选项
type pushModeOption struct {
	karmadaClient           karmadaclientset.Interface
	clusterName             string
	karmadaRestConfig       *rest.Config
	memberClusterRestConfig *rest.Config
}

// accessClusterInPushMode 在推送模式下访问集群
func accessClusterInPushMode(opts *pushModeOption) error {
	registerOption := karmadautil.ClusterRegisterOption{
		ClusterNamespace:   ClusterNamespace,
		ClusterName:        opts.clusterName,
		ReportSecrets:      []string{karmadautil.KubeCredentials, karmadautil.KubeImpersonator},
		ControlPlaneConfig: opts.karmadaRestConfig,
		ClusterConfig:      opts.memberClusterRestConfig,
	}

	// 创建控制平面客户端
	controlPlaneKubeClient := kubeclient.NewForConfigOrDie(opts.karmadaRestConfig)
	// 创建成员集群客户端
	memberClusterKubeClient := kubeclient.NewForConfigOrDie(opts.memberClusterRestConfig)
	// 获取成员集群ID
	id, err := karmadautil.ObtainClusterID(memberClusterKubeClient)
	if err != nil {
		klog.ErrorS(err, "ObtainClusterID failed")
		return err
	}
	// 检查集群ID是否唯一
	exist, name, err := karmadautil.IsClusterIdentifyUnique(opts.karmadaClient, id)
	if err != nil {
		klog.ErrorS(err, "Check ClusterIdentify failed")
		return err
	}
	// 如果集群ID不唯一，返回错误
	if !exist {
		return fmt.Errorf("the same cluster has been registered with name %s", name)
	}
	// 设置集群ID
	registerOption.ClusterID = id
	// 获取成员集群凭证
	clusterSecret, impersonatorSecret, err := karmadautil.ObtainCredentialsFromMemberCluster(memberClusterKubeClient, registerOption)
	if err != nil {
		klog.ErrorS(err, "ObtainCredentialsFromMemberCluster failed")
		return err
	}
	// 设置集群凭证
	registerOption.Secret = *clusterSecret
	registerOption.ImpersonatorSecret = *impersonatorSecret
	// 注册集群
	err = karmadautil.RegisterClusterInControllerPlane(registerOption, controlPlaneKubeClient, generateClusterInControllerPlane)
	if err != nil {
		return err
	}
	// 打印成功信息
	klog.Infof("cluster(%s) is joined successfully\n", opts.clusterName)
	return nil
}

// generateClusterInControllerPlane 在控制平面中生成集群对象
func generateClusterInControllerPlane(opts karmadautil.ClusterRegisterOption) (*clusterv1alpha1.Cluster, error) {
	clusterObj := &clusterv1alpha1.Cluster{}
	// 设置集群名称
	clusterObj.Name = opts.ClusterName
	// 设置同步模式
	clusterObj.Spec.SyncMode = clusterv1alpha1.Push
	// 设置API端点
	clusterObj.Spec.APIEndpoint = opts.ClusterConfig.Host
	// 设置集群ID
	clusterObj.Spec.ID = opts.ClusterID
	// 设置集群凭证
	clusterObj.Spec.SecretRef = &clusterv1alpha1.LocalSecretReference{
		Namespace: opts.Secret.Namespace,
		Name:      opts.Secret.Name,
	}
	// 设置集群凭证
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

	// 设置集群配置
	clusterObj.Spec.InsecureSkipTLSVerification = opts.ClusterConfig.TLSClientConfig.Insecure

	if opts.ClusterConfig.Proxy != nil {
		url, err := opts.ClusterConfig.Proxy(nil)
		if err != nil {
			return nil, fmt.Errorf("clusterConfig.Proxy error, %v", err)
		}
		clusterObj.Spec.ProxyURL = url.String()
	}

	// 创建控制平面Karmada客户端
	controlPlaneKarmadaClient := karmadaclientset.NewForConfigOrDie(opts.ControlPlaneConfig)
	// 创建集群对象
	cluster, err := karmadautil.CreateClusterObject(controlPlaneKarmadaClient, clusterObj)
	if err != nil {
		return nil, fmt.Errorf("failed to create cluster(%s) object. error: %v", opts.ClusterName, err)
	}
	// 返回集群对象
	return cluster, nil
}
