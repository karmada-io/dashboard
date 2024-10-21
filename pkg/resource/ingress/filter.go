package ingress

import (
	"github.com/karmada-io/dashboard/pkg/common/types"
	networkingv1 "k8s.io/api/networking/v1"
)

func FilterIngressByService(ingresses []networkingv1.Ingress, serviceName string) []networkingv1.Ingress {
	var matchingIngresses []networkingv1.Ingress
	for _, ingress := range ingresses {
		if ingressMatchesServiceName(ingress, serviceName) {
			matchingIngresses = append(matchingIngresses, ingress)
		}
	}
	return matchingIngresses
}

func ingressMatchesServiceName(ingress networkingv1.Ingress, serviceName string) bool {
	spec := ingress.Spec
	if ingressBackendMatchesServiceName(spec.DefaultBackend, serviceName) {
		return true
	}

	for _, rule := range spec.Rules {
		if rule.IngressRuleValue.HTTP == nil {
			continue
		}
		for _, path := range rule.IngressRuleValue.HTTP.Paths {
			if ingressBackendMatchesServiceName(&path.Backend, serviceName) {
				return true
			}
		}
	}
	return false
}

func ingressBackendMatchesServiceName(ingressBackend *networkingv1.IngressBackend, serviceName string) bool {
	if ingressBackend == nil {
		return false
	}

	if ingressBackend.Service != nil && ingressBackend.Service.Name == serviceName {
		return true
	}

	if ingressBackend.Resource != nil && ingressBackend.Resource.Kind == types.ResourceKindService && ingressBackend.Resource.Name == serviceName {
		return true
	}
	return false
}
