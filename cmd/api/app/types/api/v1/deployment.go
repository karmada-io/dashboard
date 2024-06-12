package v1

type CreateDeploymentRequest struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Content   string `json:"content"`
}
type CreateDeploymentResponse struct{}
