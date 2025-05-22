package clientwrapper

import (
	"fmt"
	"net/http"

	upstreamclient "k8s.io/dashboard/client" // adjust import path as per your setup
	karmadaclient "github.com/karmada-io/dashboard/pkg/client"       // your karmadaclient import
	"k8s.io/klog/v2"
    "k8s.io/dashboard/client"
    "k8s.io/dashboard/client/cache/client" // alias cacheclient if needed
    "k8s.io/dashboard/pkg/args"
)

// Header key for member cluster
const MemberClusterHeaderName = "X-Member-ClusterName"

// isInitialized checks if the upstream client package is initialized
func isInitialized() bool {
	return client.IsInitialized()
}

// configFromRequest gets the Kubernetes rest config from the request (calls upstream method)
func configFromRequest(request *http.Request) (*client.Config, error) {
	return client.ConfigFromRequest(request)
}

// GetBearerToken gets bearer token from request (calls upstream method)
func GetBearerToken(request *http.Request) string {
	return client.GetBearerToken(request)
}

// Client returns a Kubernetes client.Interface based on request context.
// Uses upstream client for single cluster mode,


const MemberClusterHeaderName = "X-Member-ClusterName"

// Client wraps the upstream Client to support karmada multi-cluster
func Client(request *http.Request) (client.Interface, error) {
    memberClusterName := request.Header.Get(MemberClusterHeaderName)

    if memberClusterName == "" {
        // Single cluster mode, delegate to upstream
        if !client.IsInitialized() {
            return nil, fmt.Errorf("client package not initialized")
        }

        config, err := client.ConfigFromRequest(request)
        if err != nil {
            return nil, err
        }

        if args.CacheEnabled() {
            return cacheclient.New(config, client.GetBearerToken(request))
        }

        return client.NewForConfig(config)
    }

    // Multi-cluster mode using Karmada
    karmadaClient := karmadaclient.InClusterClientForMemberCluster(memberClusterName)
    if karmadaClient == nil {
        return nil, fmt.Errorf("member cluster client is not initialized")
    }
    return karmadaClient, nil
}
