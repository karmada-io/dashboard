package auth

import (
	"bytes"
	"encoding/json"
	"github.com/golang-jwt/jwt/v4"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"net/http"
)

const (
	tokenServiceAccountKey = "serviceaccount"
)

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
	parsed, _ := jwt.Parse(token, nil)
	if parsed == nil {
		return &v1.User{Authenticated: true}
	}

	claims := parsed.Claims.(jwt.MapClaims)

	found, value := traverse(tokenServiceAccountKey, claims)
	if !found {
		return &v1.User{Authenticated: true}
	}

	var sa v1.ServiceAccount
	ok := transcode(value, &sa)
	if !ok {
		return &v1.User{Authenticated: true}
	}

	return &v1.User{Name: sa.Name, Authenticated: true}
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
