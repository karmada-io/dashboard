package v1

// todo this is only a simple version of pp request, just for POC
type PostPropagationPolicyRequest struct {
	PropagationData string `json:"propagationData" binding:"required"`
	IsClusterScope  bool   `json:"isClusterScope"`
	Namespace       string `json:"namespace"`
}

type PostPropagationPolicyResponse struct {
}

type PutPropagationPolicyRequest struct {
	PropagationData string `json:"propagationData" binding:"required"`
	IsClusterScope  bool   `json:"isClusterScope"`
	Namespace       string `json:"namespace"`
	Name            string `json:"name" binding:"required"`
}

type PutPropagationPolicyResponse struct {
}

type DeletePropagationPolicyRequest struct {
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

type DeletePropagationPolicyResponse struct {
}
