package v1

type PostOverridePolicyRequest struct {
	OverrideData   string `json:"overrideData" binding:"required"`
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
}

type PostOverridePolicyResponse struct {
}

type PutOverridePolicyRequest struct {
	OverrideData   string `json:"overrideData" binding:"required"`
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

type PutOverridePolicyResponse struct {
}

type DeleteOverridePolicyRequest struct {
	IsClusterScope bool   `json:"isClusterScope"`
	Namespace      string `json:"namespace"`
	Name           string `json:"name" binding:"required"`
}

type DeleteOverridePolicyResponse struct {
}
