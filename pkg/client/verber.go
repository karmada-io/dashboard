package client

import (
	"context"
	"fmt"
	"github.com/gobuffalo/flect"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8stypes "k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/jsonmergepatch"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
	"net/http"
	"strings"
)

var (
	kindToGroupVersionResource = map[string]schema.GroupVersionResource{}
)

// resourceVerber is a struct responsible for doing common verb operations on resources, like
// DELETE, PUT, UPDATE.
type resourceVerber struct {
	client    dynamic.Interface
	discovery discovery.DiscoveryInterface
}

func (v *resourceVerber) groupVersionResourceFromUnstructured(object *unstructured.Unstructured) schema.GroupVersionResource {
	gvk := object.GetObjectKind().GroupVersionKind()

	return schema.GroupVersionResource{
		Group:    gvk.Group,
		Version:  gvk.Version,
		Resource: flect.Pluralize(strings.ToLower(gvk.Kind)),
	}
}

func (v *resourceVerber) groupVersionResourceFromKind(kind string) (schema.GroupVersionResource, error) {
	if gvr, exists := kindToGroupVersionResource[kind]; exists {
		klog.V(3).InfoS("GroupVersionResource cache hit", "kind", kind)
		return gvr, nil
	}

	klog.V(3).InfoS("GroupVersionResource cache miss", "kind", kind)
	_, resourceList, err := v.discovery.ServerGroupsAndResources()
	if err != nil {
		return schema.GroupVersionResource{}, err
	}

	// Update cache
	if err = v.buildGroupVersionResourceCache(resourceList); err != nil {
		return schema.GroupVersionResource{}, err
	}

	if gvr, exists := kindToGroupVersionResource[kind]; exists {
		return gvr, nil
	}

	return schema.GroupVersionResource{}, fmt.Errorf("could not find GVR for kind %s", kind)
}

func (v *resourceVerber) buildGroupVersionResourceCache(resourceList []*metav1.APIResourceList) error {
	for _, resource := range resourceList {
		gv, err := schema.ParseGroupVersion(resource.GroupVersion)
		if err != nil {
			return err
		}

		for _, apiResource := range resource.APIResources {
			crdKind := fmt.Sprintf("%s.%s", apiResource.Name, gv.Group)
			gvr := schema.GroupVersionResource{
				Group:    gv.Group,
				Version:  gv.Version,
				Resource: apiResource.Name,
			}

			// Ignore sub-resources. Top level resource names should not contain slash
			if strings.Contains(apiResource.Name, "/") {
				continue
			}

			// Mapping for core resources
			kindToGroupVersionResource[strings.ToLower(apiResource.Kind)] = gvr

			// Mapping for CRD resources with custom kind
			kindToGroupVersionResource[crdKind] = gvr
		}
	}

	return nil
}

// Delete deletes the resource of the given kind in the given namespace with the given name.
func (v *resourceVerber) Delete(kind string, namespace string, name string, deleteNow bool) error {
	gvr, err := v.groupVersionResourceFromKind(kind)
	if err != nil {
		return err
	}

	// Do cascade delete by default, as this is what users typically expect.
	defaultPropagationPolicy := metav1.DeletePropagationForeground
	defaultDeleteOptions := metav1.DeleteOptions{
		PropagationPolicy: &defaultPropagationPolicy,
	}

	if deleteNow {
		gracePeriodSeconds := int64(1)
		defaultDeleteOptions.GracePeriodSeconds = &gracePeriodSeconds
	}

	return v.client.Resource(gvr).Namespace(namespace).Delete(context.TODO(), name, defaultDeleteOptions)
}

// Update patches resource of the given kind in the given namespace with the given name.
func (v *resourceVerber) Update(object *unstructured.Unstructured) error {
	name := object.GetName()
	namespace := object.GetNamespace()
	gvr := v.groupVersionResourceFromUnstructured(object)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		klog.V(2).InfoS("fetching latest resource version", "group", gvr.Group, "version", gvr.Version, "resource", gvr.Resource, "name", name, "namespace", namespace)
		result, getErr := v.client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
		if getErr != nil {
			return fmt.Errorf("failed to get latest %s version: %v", gvr.Resource, getErr)
		}

		origData, err := result.MarshalJSON()
		if err != nil {
			return fmt.Errorf("failed to marshal original data: %+v", err)
		}

		// Update resource version from latest object to not end up with resource version conflict.
		object.SetResourceVersion(result.GetResourceVersion())
		modifiedData, err := object.MarshalJSON()
		if err != nil {
			return fmt.Errorf("failed to marshal modified data: %+v", err)
		}

		patchBytes, err := jsonmergepatch.CreateThreeWayJSONMergePatch(origData, modifiedData, origData)
		if err != nil {
			return fmt.Errorf("failed creating merge patch: %+v", err)
		}

		klog.V(3).InfoS("patching resource", "group", gvr.Group, "version", gvr.Version, "resource", gvr.Resource, "name", name, "namespace", namespace, "patch", string(patchBytes))
		_, updateErr := v.client.Resource(gvr).Namespace(namespace).Patch(context.TODO(), name, k8stypes.MergePatchType, patchBytes, metav1.PatchOptions{})
		return updateErr
	})
}

// Get gets the resource of the given kind in the given namespace with the given name.
func (v *resourceVerber) Get(kind string, namespace string, name string) (runtime.Object, error) {
	gvr, err := v.groupVersionResourceFromKind(kind)
	if err != nil {
		return nil, err
	}
	return v.client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
}

// Create creates the resource of the given kind in the given namespace with the given name.
func (v *resourceVerber) Create(object *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	namespace := object.GetNamespace()
	gvr := v.groupVersionResourceFromUnstructured(object)

	return v.client.Resource(gvr).Namespace(namespace).Create(context.TODO(), object, metav1.CreateOptions{})
}

func VerberClient(request *http.Request) (ResourceVerber, error) {
	// todo currently ignore rest.config from http.Request
	restConfig, _, err := GetKarmadaConfig()
	if err != nil {
		return nil, err
	}
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
	if err != nil {
		return nil, err
	}

	dynamicConfig := dynamic.ConfigFor(restConfig)

	dynamicClient, err := dynamic.NewForConfig(dynamicConfig)
	if err != nil {
		return nil, err
	}

	return &resourceVerber{
		client:    dynamicClient,
		discovery: discoveryClient,
	}, nil
}
