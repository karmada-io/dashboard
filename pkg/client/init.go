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

package client

import (
	"errors"
	"fmt"
	"os"
	"sync"

	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	kubeclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/klog/v2"
)

const proxyURL = "/apis/cluster.karmada.io/v1alpha1/clusters/%s/proxy/"

var (
	kubernetesRestConfig               *rest.Config
	kubernetesApiConfig                *clientcmdapi.Config
	inClusterClient                    kubeclient.Interface
	karmadaRestConfig                  *rest.Config
	karmadaApiConfig                   *clientcmdapi.Config
	karmadaMemberConfig                *rest.Config
	inClusterKarmadaClient             karmadaclientset.Interface
	inClusterClientForKarmadaApiServer kubeclient.Interface
	inClusterClientForMemberApiServer  kubeclient.Interface
	memberClients                      sync.Map
)

type configBuilder struct {
	kubeconfigPath string
	kubeContext    string
	insecure       bool
	userAgent      string
}

type Option func(*configBuilder)

func WithUserAgent(agent string) Option {
	return func(c *configBuilder) {
		c.userAgent = agent
	}
}

func WithKubeconfig(path string) Option {
	return func(c *configBuilder) {
		c.kubeconfigPath = path
	}
}

func WithKubeContext(kubecontext string) Option {
	return func(c *configBuilder) {
		c.kubeContext = kubecontext
	}
}

func WithInsecureTLSSkipVerify(insecure bool) Option {
	return func(c *configBuilder) {
		c.insecure = insecure
	}
}

func newConfigBuilder(options ...Option) *configBuilder {
	builder := &configBuilder{}

	for _, opt := range options {
		opt(builder)
	}

	return builder
}

func (in *configBuilder) buildRestConfig() (*rest.Config, error) {
	if len(in.kubeconfigPath) == 0 {
		return nil, errors.New("must specify kubeconfig")
	}
	klog.InfoS("Using kubeconfig", "kubeconfig", in.kubeconfigPath)

	restConfig, err := LoadRestConfig(in.kubeconfigPath, in.kubeContext)
	if err != nil {
		return nil, err
	}

	restConfig.QPS = DefaultQPS
	restConfig.Burst = DefaultBurst
	// TODO: make clear that why karmada apiserver seems only can use application/json, however kubernetest apiserver can use "application/vnd.kubernetes.protobuf"
	restConfig.UserAgent = DefaultUserAgent + "/" + in.userAgent
	restConfig.TLSClientConfig.Insecure = in.insecure

	return restConfig, nil
}

func (in *configBuilder) buildApiConfig() (*clientcmdapi.Config, error) {
	if len(in.kubeconfigPath) == 0 {
		return nil, errors.New("must specify kubeconfig")
	}
	klog.InfoS("Using kubeconfig", "kubeconfig", in.kubeconfigPath)
	apiConfig, err := LoadApiConfig(in.kubeconfigPath, in.kubeContext)
	if err != nil {
		return nil, err
	}
	return apiConfig, nil
}

func isKubeInitialized() bool {
	if kubernetesRestConfig == nil || kubernetesApiConfig == nil {
		klog.Errorf(`karmada/karmada-dashboard/client' package has not been initialized properly. Run 'client.InitKubeConfig(...)' to initialize it. `)
		return false
	}
	return true
}

func InitKubeConfig(options ...Option) {
	builder := newConfigBuilder(options...)
	// prefer InClusterConfig, if something wrong, use explicit kubeconfig path
	restConfig, err := rest.InClusterConfig()
	if err == nil {
		klog.Infof("InitKubeConfig by InClusterConfig method")
		restConfig.UserAgent = DefaultUserAgent + "/" + builder.userAgent
		restConfig.TLSClientConfig.Insecure = builder.insecure
		kubernetesRestConfig = restConfig

		apiConfig := ConvertRestConfigToAPIConfig(restConfig)
		kubernetesApiConfig = apiConfig
	} else {
		klog.Infof("InClusterConfig error: %+v", err)
		klog.Infof("InitKubeConfig by explicit kubeconfig path")
		restConfig, err = builder.buildRestConfig()
		if err != nil {
			klog.Errorf("Could not init client config: %s", err)
			os.Exit(1)
		}
		kubernetesRestConfig = restConfig
		apiConfig, err := builder.buildApiConfig()
		if err != nil {
			klog.Errorf("Could not init api config: %s", err)
			os.Exit(1)
		}
		kubernetesApiConfig = apiConfig
	}
}

func InClusterClient() kubeclient.Interface {
	if !isKubeInitialized() {
		return nil
	}

	if inClusterClient != nil {
		return inClusterClient
	}

	// init on-demand only
	c, err := kubeclient.NewForConfig(kubernetesRestConfig)
	if err != nil {
		klog.ErrorS(err, "Could not init kubernetes in-cluster client")
		os.Exit(1)
	}
	// initialize in-memory client
	inClusterClient = c
	return inClusterClient
}

func GetKubeConfig() (*rest.Config, *clientcmdapi.Config, error) {
	if !isKubeInitialized() {
		return nil, nil, fmt.Errorf("client package not initialized")
	}
	return kubernetesRestConfig, kubernetesApiConfig, nil
}

func isKarmadaInitialized() bool {
	if karmadaRestConfig == nil || karmadaApiConfig == nil {
		klog.Errorf(`karmada/karmada-dashboard/client' package has not been initialized properly. Run 'client.InitKarmadaConfig(...)' to initialize it. `)
		return false
	}
	return true
}

func InitKarmadaConfig(options ...Option) {
	builder := newConfigBuilder(options...)
	restConfig, err := builder.buildRestConfig()
	if err != nil {
		klog.Errorf("Could not init client config: %s", err)
		os.Exit(1)
	}
	karmadaRestConfig = restConfig

	apiConfig, err := builder.buildApiConfig()
	if err != nil {
		klog.Errorf("Could not init api config: %s", err)
		os.Exit(1)
	}
	karmadaApiConfig = apiConfig

	memberConfig, err := builder.buildRestConfig()
	if err != nil {
		klog.Errorf("Could not init member config: %s", err)
		os.Exit(1)
	}
	karmadaMemberConfig = memberConfig
}

func InClusterKarmadaClient() karmadaclientset.Interface {
	if !isKarmadaInitialized() {
		return nil
	}
	if inClusterKarmadaClient != nil {
		return inClusterKarmadaClient
	}
	// init on-demand only
	c, err := karmadaclientset.NewForConfig(karmadaRestConfig)
	if err != nil {
		klog.ErrorS(err, "Could not init karmada in-cluster client")
		os.Exit(1)
	}
	// initialize in-memory client
	inClusterKarmadaClient = c
	return inClusterKarmadaClient
}

func GetKarmadaConfig() (*rest.Config, *clientcmdapi.Config, error) {
	if !isKarmadaInitialized() {
		return nil, nil, fmt.Errorf("client package not initialized")
	}
	return karmadaRestConfig, karmadaApiConfig, nil
}

func GetMemberConfig() (*rest.Config, error) {
	if !isKarmadaInitialized() {
		return nil, fmt.Errorf("client package not initialized")
	}
	return karmadaMemberConfig, nil
}

func InClusterClientForKarmadaApiServer() kubeclient.Interface {
	if !isKarmadaInitialized() {
		return nil
	}
	if inClusterClientForKarmadaApiServer != nil {
		return inClusterClientForKarmadaApiServer
	}
	restConfig, _, err := GetKarmadaConfig()
	if err != nil {
		klog.ErrorS(err, "Could not get karmada restConfig")
		return nil
	}
	c, err := kubeclient.NewForConfig(restConfig)
	if err != nil {
		klog.ErrorS(err, "Could not init kubernetes in-cluster client for karmada apiserver")
		return nil
	}
	inClusterClientForKarmadaApiServer = c
	return inClusterClientForKarmadaApiServer
}

func InClusterClientForMemberCluster(clusterName string) kubeclient.Interface {
	if !isKarmadaInitialized() {
		return nil
	}

	// Load and return Interface for member apiserver if already exist
	if value, ok := memberClients.Load(clusterName); ok {
		if inClusterClientForMemberApiServer, ok = value.(kubeclient.Interface); ok {
			return inClusterClientForMemberApiServer
		} else {
			klog.Error("Could not get client for member apiserver")
			return nil
		}
	}

	// Client for new member apiserver
	restConfig, _, err := GetKarmadaConfig()
	if err != nil {
		klog.ErrorS(err, "Could not get karmada restConfig")
		return nil
	}
	memberConfig, err := GetMemberConfig()
	if err != nil {
		klog.ErrorS(err, "Could not get member restConfig")
		return nil
	}
	memberConfig.Host = restConfig.Host + fmt.Sprintf(proxyURL, clusterName)
	c, err := kubeclient.NewForConfig(memberConfig)
	if err != nil {
		klog.ErrorS(err, "Could not init kubernetes in-cluster client for member apiserver")
		return nil
	}
	inClusterClientForMemberApiServer = c
	memberClients.Store(clusterName, inClusterClientForMemberApiServer)
	return inClusterClientForMemberApiServer
}

func ConvertRestConfigToAPIConfig(restConfig *rest.Config) *clientcmdapi.Config {
	// 将 rest.Config 转换为 clientcmdapi.Config
	clientcmdConfig := clientcmdapi.NewConfig()
	clientcmdConfig.Clusters["clusterName"] = &clientcmdapi.Cluster{
		Server:                   restConfig.Host,
		InsecureSkipTLSVerify:    restConfig.Insecure,
		CertificateAuthorityData: restConfig.TLSClientConfig.CAData,
	}

	clientcmdConfig.AuthInfos["authInfoName"] = &clientcmdapi.AuthInfo{
		ClientCertificateData: restConfig.TLSClientConfig.CertData,
		ClientKeyData:         restConfig.TLSClientConfig.KeyData,
	}
	clientcmdConfig.Contexts["contextName"] = &clientcmdapi.Context{
		Cluster:  "clusterName",
		AuthInfo: "authInfoName",
	}
	clientcmdConfig.CurrentContext = "contextName"
	return clientcmdConfig
}
