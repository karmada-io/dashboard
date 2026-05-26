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

package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
)

const (
	tokenServiceAccountKey = "serviceaccount"
)

// GetCurrentUser returns the current user from the context .
func GetCurrentUser(c *gin.Context) (*v1.User, int, error) {
	return me(c.Request)
}

func me(request *http.Request) (*v1.User, int, error) {
	karmadaClient, err := client.GetKarmadaClientFromRequest(request)
	if err != nil {
		code, err := errors.HandleError(err)
		return nil, code, err
	}

	// Make sure that authorization token is valid
	if _, err = karmadaClient.Discovery().ServerVersion(); err != nil {
		code, err := errors.HandleError(err)
		return nil, code, err
	}

	return getUserFromToken(client.GetBearerToken(request)), http.StatusOK, nil
}

func getUserFromToken(token string) *v1.User {
	user := &v1.User{Authenticated: true, AuthType: "token"}
	claims := parseTokenClaims(token)
	if claims == nil {
		return user
	}

	// service account token path
	found, value := traverse(tokenServiceAccountKey, claims)
	if found {
		var sa v1.ServiceAccount
		if ok := transcode(value, &sa); ok && sa.Name != "" {
			user.Name = sa.Name
			return user
		}
	}

	// oidc/general jwt claims path
	if sub, ok := claims["sub"].(string); ok && strings.TrimSpace(sub) != "" {
		user.AuthType = "oidc"
	}
	if name, ok := claims["name"].(string); ok {
		user.Name = strings.TrimSpace(name)
	}
	if email, ok := claims["email"].(string); ok {
		user.Email = strings.TrimSpace(email)
	}
	if preferred, ok := claims["preferred_username"].(string); ok {
		user.PreferredUsername = strings.TrimSpace(preferred)
	}
	if user.Name == "" {
		if user.PreferredUsername != "" {
			user.Name = user.PreferredUsername
		} else if user.Email != "" {
			user.Name = user.Email
		}
	}
	return user
}

func parseTokenClaims(token string) jwt.MapClaims {
	parser := jwt.NewParser()
	claims := jwt.MapClaims{}
	_, _, err := parser.ParseUnverified(token, claims)
	if err != nil {
		return nil
	}
	return claims
}

func traverse(key string, m map[string]interface{}) (found bool, value interface{}) {
	for k, v := range m {
		if k == key {
			return true, v
		}

		if innerMap, ok := v.(map[string]interface{}); ok {
			return traverse(key, innerMap)
		}
	}

	return false, ""
}

func transcode(in, out interface{}) bool {
	buf := new(bytes.Buffer)
	err := json.NewEncoder(buf).Encode(in)
	if err != nil {
		return false
	}

	err = json.NewDecoder(buf).Decode(out)
	return err == nil
}
