package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	defaultAddr = ":18080"
	addrEnvName = "CALLBACK_ADDR"
	// #nosec G101 -- Public OAuth endpoint URL, not a hardcoded secret.
	feishuTokenEndpoint      = "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
	feishuUserInfoEndpoint   = "https://open.feishu.cn/open-apis/authen/v1/user_info"
	stateTTL                 = 10 * time.Minute
	stateCleanupInterval     = 2 * time.Minute
	requestTimeout           = 10 * time.Second
	readHeaderTimeout        = 5 * time.Second
	readTimeout              = 10 * time.Second
	writeTimeout             = 15 * time.Second
	idleTimeout              = 60 * time.Second
	defaultExpectedStateName = "state"
)

type tokenResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		AccessToken string `json:"access_token"`
	} `json:"data"`
}

type userInfoResponse struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data json.RawMessage `json:"data"`
}

type callbackDebugResponse struct {
	NowUTC      string          `json:"nowUtc"`
	Code        string          `json:"code"`
	State       string          `json:"state"`
	AccessToken string          `json:"accessToken,omitempty"`
	UserInfo    json.RawMessage `json:"userInfo,omitempty"`
	OIDCDebug   *oidcDebugInfo  `json:"oidcDebug,omitempty"`
	Warning     string          `json:"warning,omitempty"`
}

type flatUserInfo struct {
	OpenID        string `json:"open_id"`
	Name          string `json:"name,omitempty"`
	EnName        string `json:"en_name,omitempty"`
	Email         string `json:"email,omitempty"`
	EmailVerified bool   `json:"email_verified"`
}

type upstreamUserInfo struct {
	OpenID        string   `json:"open_id"`
	UserID        string   `json:"user_id"`
	UnionID       string   `json:"union_id"`
	Sub           string   `json:"sub"`
	Name          string   `json:"name"`
	EnName        string   `json:"en_name"`
	Email         string   `json:"email"`
	Groups        []string `json:"groups,omitempty"`
	EmailVerified *bool    `json:"email_verified"`
}

type oidcDebugInfo struct {
	DexUserIDCandidate string   `json:"dexUserIdCandidate"`
	K8sUsernameBySub   string   `json:"k8sUsernameBySub"`
	SubFromUserInfo    string   `json:"subFromUserInfo,omitempty"`
	OpenID             string   `json:"openId,omitempty"`
	UserID             string   `json:"userId,omitempty"`
	UnionID            string   `json:"unionId,omitempty"`
	Groups             []string `json:"groups,omitempty"`
}

type userInfoDebugResponse struct {
	Flat *flatUserInfo   `json:"flat"`
	Raw  json.RawMessage `json:"raw"`
	OIDC *oidcDebugInfo  `json:"oidc"`
}

type stateStore struct {
	mu    sync.Mutex
	items map[string]time.Time
}

func newStateStore() *stateStore {
	return &stateStore{items: make(map[string]time.Time)}
}

func (s *stateStore) put(state string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[state] = time.Now()
}

func (s *stateStore) consume(state string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	createdAt, ok := s.items[state]
	if !ok {
		return false
	}
	delete(s.items, state)
	return time.Since(createdAt) <= stateTTL
}

func (s *stateStore) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, createdAt := range s.items {
		if time.Since(createdAt) > stateTTL {
			delete(s.items, k)
		}
	}
}

func main() {
	appID := os.Getenv("FEISHU_APP_ID")
	appSecret := os.Getenv("FEISHU_APP_SECRET")
	enableOAuthCallback := appID != "" && appSecret != ""
	if !enableOAuthCallback {
		log.Printf("FEISHU_APP_ID/FEISHU_APP_SECRET not set, /auth/start and /callback are disabled")
	}

	addr := strings.TrimSpace(os.Getenv(addrEnvName))
	if addr == "" {
		addr = defaultAddr
	}

	store := newStateStore()
	go func() {
		ticker := time.NewTicker(stateCleanupInterval)
		defer ticker.Stop()
		for range ticker.C {
			store.cleanup()
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/auth/start", func(w http.ResponseWriter, _ *http.Request) {
		if !enableOAuthCallback {
			http.Error(w, "oauth callback flow disabled: FEISHU_APP_ID/FEISHU_APP_SECRET not set", http.StatusServiceUnavailable)
			return
		}

		state, err := generateState()
		if err != nil {
			http.Error(w, fmt.Sprintf("generate state failed: %v", err), http.StatusInternalServerError)
			return
		}

		store.put(state)
		q := url.Values{}
		q.Set(defaultExpectedStateName, state)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"state": state,
			"hint":  "Use this state in your Feishu authorize URL callback.",
			"next":  "/callback?" + q.Encode() + "&code=<code>",
		})
	})

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		if !enableOAuthCallback {
			http.Error(w, "oauth callback flow disabled: FEISHU_APP_ID/FEISHU_APP_SECRET not set", http.StatusServiceUnavailable)
			return
		}

		code := strings.TrimSpace(r.URL.Query().Get("code"))
		state := strings.TrimSpace(r.URL.Query().Get(defaultExpectedStateName))
		if code == "" || state == "" {
			http.Error(w, "missing code or state", http.StatusBadRequest)
			return
		}
		if !store.consume(state) {
			http.Error(w, "invalid or expired state", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
		defer cancel()

		accessToken, err := exchangeToken(ctx, appID, appSecret, code)
		if err != nil {
			http.Error(w, fmt.Sprintf("exchange token failed: %v", err), http.StatusBadGateway)
			return
		}

		userInfo, err := fetchUserInfo(ctx, accessToken)
		resp := callbackDebugResponse{
			NowUTC:      time.Now().UTC().Format(time.RFC3339),
			Code:        code,
			State:       state,
			AccessToken: accessToken,
		}
		if err != nil {
			resp.Warning = "token ok, userinfo failed: " + err.Error()
		} else {
			resp.UserInfo = userInfo
			resp.OIDCDebug = buildOIDCDebug(userInfo)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	mux.HandleFunc("/userinfo", func(w http.ResponseWriter, r *http.Request) {
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		if auth == "" {
			writeJSONError(w, http.StatusUnauthorized, "missing_authorization")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
		defer cancel()

		rawData, err := fetchUserInfoByAuthorization(ctx, auth)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, err.Error())
			return
		}

		flat, err := flattenUserInfo(rawData)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(flat)
	})

	mux.HandleFunc("/userinfo/debug", func(w http.ResponseWriter, r *http.Request) {
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		if auth == "" {
			writeJSONError(w, http.StatusUnauthorized, "missing_authorization")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
		defer cancel()

		rawData, err := fetchUserInfoByAuthorization(ctx, auth)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, err.Error())
			return
		}

		flat, err := flattenUserInfo(rawData)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(userInfoDebugResponse{
			Flat: flat,
			Raw:  rawData,
			OIDC: buildOIDCDebug(rawData),
		})
	})

	log.Printf("temporary callback server listening on %s", addr)
	if enableOAuthCallback {
		log.Printf("GET /auth/start to generate state, then use /callback?code=...&state=...")
	}
	log.Printf("GET /userinfo with Authorization header for Dex userInfoURL adapter")
	log.Printf("GET /userinfo/debug with Authorization header for detailed OIDC/RBAC hints")
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}
	log.Fatal(server.ListenAndServe())
}

func generateState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func exchangeToken(ctx context.Context, appID, appSecret, code string) (string, error) {
	body := strings.NewReader(fmt.Sprintf(`{"grant_type":"authorization_code","code":"%s"}`, code))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, feishuTokenEndpoint, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+base64.StdEncoding.EncodeToString([]byte(appID+":"+appSecret)))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}

	var tr tokenResponse
	if err := json.Unmarshal(raw, &tr); err != nil {
		return "", fmt.Errorf("decode token response failed: %w", err)
	}
	if tr.Code != 0 || tr.Data.AccessToken == "" {
		return "", fmt.Errorf("feishu token error code=%d msg=%s raw=%s", tr.Code, tr.Msg, string(raw))
	}
	return tr.Data.AccessToken, nil
}

func fetchUserInfo(ctx context.Context, accessToken string) (json.RawMessage, error) {
	return fetchUserInfoByAuthorization(ctx, "Bearer "+accessToken)
}

func fetchUserInfoByAuthorization(ctx context.Context, authorization string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feishuUserInfoEndpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authorization)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}

	var ur userInfoResponse
	if err := json.Unmarshal(raw, &ur); err != nil {
		return nil, fmt.Errorf("decode userinfo failed: %w", err)
	}
	if ur.Code != 0 {
		return nil, fmt.Errorf("feishu userinfo error code=%d msg=%s raw=%s", ur.Code, ur.Msg, string(raw))
	}
	return ur.Data, nil
}

func flattenUserInfo(raw json.RawMessage) (*flatUserInfo, error) {
	var in upstreamUserInfo
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, fmt.Errorf("decode userinfo.data failed: %w", err)
	}

	id := firstNonEmpty(in.OpenID, in.UserID, in.UnionID, in.Sub)
	if id == "" {
		return nil, errors.New("missing open_id/user_id/union_id/sub in userinfo.data")
	}

	out := &flatUserInfo{
		OpenID:        id,
		Name:          in.Name,
		EnName:        in.EnName,
		Email:         in.Email,
		EmailVerified: in.EmailVerified != nil && *in.EmailVerified,
	}
	return out, nil
}

func buildOIDCDebug(raw json.RawMessage) *oidcDebugInfo {
	var in upstreamUserInfo
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil
	}

	id := firstNonEmpty(in.OpenID, in.UserID, in.UnionID, in.Sub)
	if id == "" {
		return &oidcDebugInfo{
			SubFromUserInfo: in.Sub,
			OpenID:          in.OpenID,
			UserID:          in.UserID,
			UnionID:         in.UnionID,
			Groups:          in.Groups,
		}
	}

	return &oidcDebugInfo{
		DexUserIDCandidate: id,
		K8sUsernameBySub:   "oidc:" + id,
		SubFromUserInfo:    in.Sub,
		OpenID:             in.OpenID,
		UserID:             in.UserID,
		UnionID:            in.UnionID,
		Groups:             in.Groups,
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": msg,
	})
}
