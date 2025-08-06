package client

import (
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

const (
	// DefaultQPS is the default globalClient QPS configuration. High enough QPS to fit all expected use cases.
	// QPS=0 is not set here, because globalClient code is overriding it.
	DefaultQPS = 1e6
	// DefaultBurst is the default globalClient burst configuration. High enough Burst to fit all expected use cases.
	// Burst=0 is not set here, because globalClient code is overriding it.
	DefaultBurst = 1e6
	// DefaultUserAgent is the default http header for user-agent
	DefaultUserAgent = "dashboard"
	// DefaultCmdConfigName is the default cluster/context/auth name to be set in clientcmd config
	DefaultCmdConfigName = "kubernetes"
	// ImpersonateUserHeader is the header name to identify username to act as.
	ImpersonateUserHeader = "Impersonate-User"
	// ImpersonateGroupHeader is the header name to identify group name to act as.
	// Can be provided multiple times to set multiple groups.
	ImpersonateGroupHeader = "Impersonate-Group"
	// ImpersonateUserExtraHeader is the header name used to associate extra fields with the user.
	// It is optional, and it requires ImpersonateUserHeader to be set.
	ImpersonateUserExtraHeader = "Impersonate-Extra-"
)

// ResourceVerber is responsible for performing generic CRUD operations on all supported resources.
type ResourceVerber interface {
	Update(object *unstructured.Unstructured) error
	Get(kind string, namespace string, name string) (runtime.Object, error)
	Delete(kind string, namespace string, name string, deleteNow bool) error
	Create(object *unstructured.Unstructured) (*unstructured.Unstructured, error)
}
