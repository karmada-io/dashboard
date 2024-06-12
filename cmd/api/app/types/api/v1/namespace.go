package v1

type CreateNamesapceRequest struct {
	Name                string `json:"name" required:"true"`
	SkipAutoPropagation bool   `json:"skipAutoPropagation"`
}
type CreateNamesapceResponse struct{}
