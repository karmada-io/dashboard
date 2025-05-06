/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package v1

// LoginRequest is the request for login.
// LoginRequest 是登录请求
type LoginRequest struct {
	Token string `json:"token"`
}

// LoginResponse is the response for login.
// LoginResponse 是登录响应
type LoginResponse struct {
	Token string `json:"token"`
}

// User is the user info.
// User 是用户信息
type User struct {
	Name          string `json:"name,omitempty"`
	Authenticated bool   `json:"authenticated"`
}

// ServiceAccount is the service account info.
// ServiceAccount 是服务账户信息
type ServiceAccount struct {
	Name string `json:"name"`
	UID  string `json:"uid"`
}
