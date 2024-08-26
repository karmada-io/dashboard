package config

import (
	"context"
	"fmt"
	"github.com/karmada-io/karmada/pkg/util/fedinformer"
	"gopkg.in/yaml.v3"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"
	"os"
)

var dashboardConfig DashboardConfig

const (
	configName      = "karmada-dashboard-configmap"
	configNamespace = "karmada-system"
	defaultEnvName  = "prod"
)

var (
	configmapGVR = schema.GroupVersionResource{
		Group:    "",
		Version:  "v1",
		Resource: "configmaps",
	}
)

func GetConfigKey() string {
	envName := os.Getenv("ENV_NAME")
	if envName == "" {
		envName = defaultEnvName
	}
	return fmt.Sprintf("%s.yaml", envName)
}

func InitDashboardConfig(k8sClient kubernetes.Interface, stopper <-chan struct{}) {
	factory := informers.NewSharedInformerFactory(k8sClient, 0)
	resource, err := factory.ForResource(configmapGVR)
	if err != nil {
		klog.Fatalf("Failed to create resource: %v", err)
		panic(err)
	}
	filterFunc := func(obj interface{}) bool {
		configMap, ok := obj.(*v1.ConfigMap)
		return ok && configMap.Namespace == configNamespace && configMap.Name == configName
	}
	onAdd := func(obj interface{}) {
		configMap := obj.(*v1.ConfigMap)
		klog.Infof("ConfigMap %s Added", configMap.Name)
		klog.Infof("ConfigMap Data is \n%+v", configMap.Data[GetConfigKey()])
		var tmpConfig DashboardConfig
		if err := yaml.Unmarshal([]byte(configMap.Data[GetConfigKey()]), &tmpConfig); err != nil {
			klog.Errorf("Failed to unmarshal ConfigMap %s: %v", configMap.Name, err)
		} else {
			dashboardConfig = tmpConfig
		}
	}
	onUpdate := func(oldObj, newObj interface{}) {
		newConfigMap := newObj.(*v1.ConfigMap)
		klog.V(2).Info("ConfigMap %s Updated\n", newConfigMap.Name)
		var tmpConfig DashboardConfig
		if err := yaml.Unmarshal([]byte(newConfigMap.Data[GetConfigKey()]), &tmpConfig); err != nil {
			klog.Errorf("Failed to unmarshal ConfigMap %s: %v", newConfigMap.Name, err)
		} else {
			dashboardConfig = tmpConfig
		}
	}
	evtHandler := fedinformer.NewFilteringHandlerOnAllEvents(filterFunc, onAdd, onUpdate, nil)
	_, err = resource.Informer().AddEventHandler(evtHandler)
	if err != nil {
		klog.Errorf("Failed to add handler for resource(%s): %v", configmapGVR.String(), err)
		return
	}

	factory.Start(stopper)
	klog.Infof("ConfigMap informer started, waiting for ConfigMap events...")
}

func GetDashboardConfig() DashboardConfig {
	return DashboardConfig{
		DockerRegistries: dashboardConfig.DockerRegistries,
		ChartRegistries:  dashboardConfig.ChartRegistries,
		MenuConfigs:      dashboardConfig.MenuConfigs,
	}
}

func UpdateDashboardConfig(k8sClient kubernetes.Interface, newDashboardConfig DashboardConfig) error {
	ctx := context.TODO()
	oldConfigMap, err := k8sClient.CoreV1().ConfigMaps(configNamespace).Get(ctx, configName, metav1.GetOptions{})
	if err != nil {
		klog.Errorf("Failed to get ConfigMap %s: %v", configName, err)
		return err
	}
	configKey := GetConfigKey()
	buff, err := yaml.Marshal(newDashboardConfig)
	if err != nil {
		klog.Errorf("Failed to marshal new dashboard config: %v", err)
		return err
	}
	oldConfigMap.Data[configKey] = string(buff)
	_, err = k8sClient.CoreV1().ConfigMaps(configNamespace).Update(ctx, oldConfigMap, metav1.UpdateOptions{})
	if err != nil {
		klog.Errorf("Failed to update ConfigMap %s: %v", configName, err)
		return err
	}
	return nil
}
