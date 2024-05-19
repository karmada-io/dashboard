package v1

type LoginRequest struct {
	Token string `json:"token"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type User struct {
	Name          string `json:"name,omitempty"`
	Authenticated bool   `json:"authenticated"`
}

type ServiceAccount struct {
	Name string `json:"name"`
	UID  string `json:"uid"`
}
