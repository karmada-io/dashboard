package common

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/helpers"
	apps "k8s.io/api/apps/v1"
	autoscaling "k8s.io/api/autoscaling/v1"
	batch "k8s.io/api/batch/v1"
	v1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbac "k8s.io/api/rbac/v1"
	storage "k8s.io/api/storage/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	client "k8s.io/client-go/kubernetes"
)

// ResourceChannels struct holds channels to resource lists. Each list channel is paired with
// an error channel which *must* be read sequentially: first read the list channel and then
// the error channel.
//
// This struct can be used when there are multiple clients that want to process, e.g., a
// list of pods. With this helper, the list can be read only once from the backend and
// distributed asynchronously to clients that need it.
//
// When a channel is nil, it means that no resource list is available for getting.
//
// Each channel pair can be read up to N times. N is specified upon creation of the channels.
type ResourceChannels struct {
	// List and error channels to Replication Controllers.
	ReplicationControllerList ReplicationControllerListChannel

	// List and error channels to Replica Sets.
	ReplicaSetList ReplicaSetListChannel

	// List and error channels to Deployments.
	DeploymentList DeploymentListChannel

	// List and error channels to Daemon Sets.
	DaemonSetList DaemonSetListChannel

	// List and error channels to Jobs.
	JobList JobListChannel

	// List and error channels to Cron Jobs.
	CronJobList CronJobListChannel

	// List and error channels to Services.
	ServiceList ServiceListChannel

	// List and error channels to Endpoints.
	EndpointList EndpointListChannel

	// List and error channels to Ingresses.
	IngressList IngressListChannel

	// List and error channels to Pods.
	PodList PodListChannel

	// List and error channels to Events.
	EventList EventListChannel

	// List and error channels to LimitRanges.
	LimitRangeList LimitRangeListChannel

	// List and error channels to Nodes.
	NodeList NodeListChannel

	// List and error channels to Namespaces.
	NamespaceList NamespaceListChannel

	// List and error channels to StatefulSets.
	StatefulSetList StatefulSetListChannel

	// List and error channels to ConfigMaps.
	ConfigMapList ConfigMapListChannel

	// List and error channels to Secrets.
	SecretList SecretListChannel

	// List and error channels to PersistentVolumes
	PersistentVolumeList PersistentVolumeListChannel

	// List and error channels to PersistentVolumeClaims
	PersistentVolumeClaimList PersistentVolumeClaimListChannel

	// List and error channels to ResourceQuotas
	ResourceQuotaList ResourceQuotaListChannel

	// List and error channels to HorizontalPodAutoscalers
	HorizontalPodAutoscalerList HorizontalPodAutoscalerListChannel

	// List and error channels to StorageClasses
	StorageClassList StorageClassListChannel

	// List and error channels to IngressClasses
	IngressClassList IngressClassListChannel

	// List and error channels to Roles
	RoleList RoleListChannel

	// List and error channels to ClusterRoles
	ClusterRoleList ClusterRoleListChannel

	// List and error channels to RoleBindings
	RoleBindingList RoleBindingListChannel

	// List and error channels to ClusterRoleBindings
	ClusterRoleBindingList ClusterRoleBindingListChannel
}

// ReplicationControllerListChannel is a list and error channels to Replication Controllers.
type ReplicationControllerListChannel struct {
	List  chan *v1.ReplicationControllerList
	Error chan error
}

// ReplicaSetListChannel is a list and error channels to Replica Sets.
type ReplicaSetListChannel struct {
	List  chan *apps.ReplicaSetList
	Error chan error
}

// GetReplicaSetListChannel returns a pair of channels to a ReplicaSet list and
// errors that both must be read numReads times.
func GetReplicaSetListChannel(client client.Interface,
	nsQuery *NamespaceQuery, numReads int) ReplicaSetListChannel {
	return GetReplicaSetListChannelWithOptions(client, nsQuery, helpers.ListEverything, numReads)
}

// GetReplicaSetListChannelWithOptions returns a pair of channels to a ReplicaSet list filtered
// by provided options and errors that both must be read numReads times.
func GetReplicaSetListChannelWithOptions(client client.Interface, nsQuery *NamespaceQuery,
	options metaV1.ListOptions, numReads int) ReplicaSetListChannel {
	channel := ReplicaSetListChannel{
		List:  make(chan *apps.ReplicaSetList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		list, err := client.AppsV1().ReplicaSets(nsQuery.ToRequestParam()).
			List(context.TODO(), options)
		var filteredItems []apps.ReplicaSet
		for _, item := range list.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		list.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- list
			channel.Error <- err
		}
	}()

	return channel
}

// DeploymentListChannel is a list and error channels to Deployments.
type DeploymentListChannel struct {
	List  chan *apps.DeploymentList
	Error chan error
}

// GetDeploymentListChannel returns a pair of channels to a Deployment list and errors
// that both must be read numReads times.
func GetDeploymentListChannel(client client.Interface,
	nsQuery *NamespaceQuery, numReads int) DeploymentListChannel {

	channel := DeploymentListChannel{
		List:  make(chan *apps.DeploymentList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		list, err := client.AppsV1().Deployments(nsQuery.ToRequestParam()).
			List(context.TODO(), helpers.ListEverything)
		var filteredItems []apps.Deployment
		for _, item := range list.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		list.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- list
			channel.Error <- err
		}
	}()

	return channel
}

// DaemonSetListChannel is a list and error channels to Daemon Sets.
type DaemonSetListChannel struct {
	List  chan *apps.DaemonSetList
	Error chan error
}

// JobListChannel is a list and error channels to Jobs.
type JobListChannel struct {
	List  chan *batch.JobList
	Error chan error
}

// CronJobListChannel is a list and error channels to Cron Jobs.
type CronJobListChannel struct {
	List  chan *batch.CronJobList
	Error chan error
}

// ServiceListChannel is a list and error channels to Services.
type ServiceListChannel struct {
	List  chan *v1.ServiceList
	Error chan error
}

// EndpointListChannel is a list and error channels to Endpoints.
type EndpointListChannel struct {
	List  chan *v1.EndpointsList
	Error chan error
}

// IngressListChannel is a list and error channels to Ingresss.
type IngressListChannel struct {
	List  chan *networkingv1.IngressList
	Error chan error
}

// PodListChannel is a list and error channels to Pods.
type PodListChannel struct {
	List  chan *v1.PodList
	Error chan error
}

// GetPodListChannel returns a pair of channels to a Pod list and errors that both must be read
// numReads times.
func GetPodListChannel(client client.Interface,
	nsQuery *NamespaceQuery, numReads int) PodListChannel {
	return GetPodListChannelWithOptions(client, nsQuery, helpers.ListEverything, numReads)
}

// GetPodListChannelWithOptions is GetPodListChannel plus listing options.
func GetPodListChannelWithOptions(client client.Interface, nsQuery *NamespaceQuery,
	options metaV1.ListOptions, numReads int) PodListChannel {

	channel := PodListChannel{
		List:  make(chan *v1.PodList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		list, err := client.CoreV1().Pods(nsQuery.ToRequestParam()).List(context.TODO(), options)
		var filteredItems []v1.Pod
		for _, item := range list.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		list.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- list
			channel.Error <- err
		}
	}()

	return channel
}

// EventListChannel is a list and error channels to Events.
type EventListChannel struct {
	List  chan *v1.EventList
	Error chan error
}

// GetEventListChannel returns a pair of channels to an Event list and errors that both must be read
// numReads times.
func GetEventListChannel(client client.Interface,
	nsQuery *NamespaceQuery, numReads int) EventListChannel {
	return GetEventListChannelWithOptions(client, nsQuery, helpers.ListEverything, numReads)
}

// GetEventListChannelWithOptions is GetEventListChannel plus list options.
func GetEventListChannelWithOptions(client client.Interface,
	nsQuery *NamespaceQuery, options metaV1.ListOptions, numReads int) EventListChannel {
	channel := EventListChannel{
		List:  make(chan *v1.EventList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		list, err := client.CoreV1().Events(nsQuery.ToRequestParam()).List(context.TODO(), options)
		var filteredItems []v1.Event
		for _, item := range list.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		list.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- list
			channel.Error <- err
		}
	}()

	return channel
}

// LimitRangeListChannel is a list and error channels to LimitRanges.
type LimitRangeListChannel struct {
	List  chan *v1.LimitRangeList
	Error chan error
}

// NodeListChannel is a list and error channels to Nodes.
type NodeListChannel struct {
	List  chan *v1.NodeList
	Error chan error
}

// NamespaceListChannel is a list and error channels to Namespaces.
type NamespaceListChannel struct {
	List  chan *v1.NamespaceList
	Error chan error
}

// StatefulSetListChannel is a list and error channels to StatefulSets.
type StatefulSetListChannel struct {
	List  chan *apps.StatefulSetList
	Error chan error
}

// GetStatefulSetListChannel returns a pair of channels to a StatefulSet list and errors that both must be read
// numReads times.
func GetStatefulSetListChannel(client client.Interface,
	nsQuery *NamespaceQuery, numReads int) StatefulSetListChannel {
	channel := StatefulSetListChannel{
		List:  make(chan *apps.StatefulSetList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		statefulSets, err := client.AppsV1().StatefulSets(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)
		var filteredItems []apps.StatefulSet
		for _, item := range statefulSets.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		statefulSets.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- statefulSets
			channel.Error <- err
		}
	}()

	return channel
}

// ConfigMapListChannel is a list and error channels to ConfigMaps.
type ConfigMapListChannel struct {
	List  chan *v1.ConfigMapList
	Error chan error
}

// GetConfigMapListChannel returns a pair of channels to a ConfigMap list and errors that both must be read
// numReads times.
func GetConfigMapListChannel(client client.Interface, nsQuery *NamespaceQuery,
	numReads int) ConfigMapListChannel {

	channel := ConfigMapListChannel{
		List:  make(chan *v1.ConfigMapList, numReads),
		Error: make(chan error, numReads),
	}

	go func() {
		list, err := client.CoreV1().ConfigMaps(nsQuery.ToRequestParam()).List(context.TODO(), helpers.ListEverything)
		var filteredItems []v1.ConfigMap
		for _, item := range list.Items {
			if nsQuery.Matches(item.ObjectMeta.Namespace) {
				filteredItems = append(filteredItems, item)
			}
		}
		list.Items = filteredItems
		for i := 0; i < numReads; i++ {
			channel.List <- list
			channel.Error <- err
		}
	}()

	return channel
}

// SecretListChannel is a list and error channels to Secrets.
type SecretListChannel struct {
	List  chan *v1.SecretList
	Error chan error
}

// PersistentVolumeListChannel is a list and error channels to PersistentVolumes.
type PersistentVolumeListChannel struct {
	List  chan *v1.PersistentVolumeList
	Error chan error
}

// PersistentVolumeClaimListChannel is a list and error channels to PersistentVolumeClaims.
type PersistentVolumeClaimListChannel struct {
	List  chan *v1.PersistentVolumeClaimList
	Error chan error
}

// ResourceQuotaListChannel is a list and error channels to ResourceQuotas.
type ResourceQuotaListChannel struct {
	List  chan *v1.ResourceQuotaList
	Error chan error
}

// HorizontalPodAutoscalerListChannel is a list and error channels.
type HorizontalPodAutoscalerListChannel struct {
	List  chan *autoscaling.HorizontalPodAutoscalerList
	Error chan error
}

// StorageClassListChannel is a list and error channels to storage classes.
type StorageClassListChannel struct {
	List  chan *storage.StorageClassList
	Error chan error
}

// IngressClassListChannel is a list and error channels to ingress classes.
type IngressClassListChannel struct {
	List  chan *networkingv1.IngressClassList
	Error chan error
}

// RoleListChannel is a list and error channels to Roles.
type RoleListChannel struct {
	List  chan *rbac.RoleList
	Error chan error
}

// ClusterRoleListChannel is a list and error channels to ClusterRoles.
type ClusterRoleListChannel struct {
	List  chan *rbac.ClusterRoleList
	Error chan error
}

// RoleBindingListChannel is a list and error channels to RoleBindings.
type RoleBindingListChannel struct {
	List  chan *rbac.RoleBindingList
	Error chan error
}

// ClusterRoleBindingListChannel is a list and error channels to ClusterRoleBindings.
type ClusterRoleBindingListChannel struct {
	List  chan *rbac.ClusterRoleBindingList
	Error chan error
}
