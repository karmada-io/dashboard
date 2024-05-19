package auth

import (
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"net/http"
)

func login(spec *v1.LoginRequest, request *http.Request) (*v1.LoginResponse, int, error) {
	ensureAuthorizationHeader(spec, request)
	karmadaClient, err := client.GetKarmadaClientFromRequest(request)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	if _, err = karmadaClient.Discovery().ServerVersion(); err != nil {
		code, err := errors.HandleError(err)
		return nil, code, err
	}

	return &v1.LoginResponse{Token: spec.Token}, http.StatusOK, nil
}

func ensureAuthorizationHeader(spec *v1.LoginRequest, request *http.Request) {
	client.SetAuthorizationHeader(request, spec.Token)
}
