package v1

type PodMetadata struct {
	UID                string            `json:"uid"`
	CreationTimestamp  string            `json:"creationTimestamp"`
	GenerateName       string            `json:"generateName"`
	Labels             map[string]string `json:"labels"`
	Name               string            `json:"name"`
}