/*
Copyright 2026 The Karmada Authors.

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

package oidc

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
)

// Config holds OIDC provider configuration
type Config struct {
	IssuerURL    string
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

// Provider wraps OIDC provider and OAuth2 config
type Provider struct {
	oauth2Config *oauth2.Config
	oidcProvider *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	stateKey     []byte
	states       sync.Map // stores state -> expiry time for CSRF protection
	usedStates   sync.Map // stores used state -> used time for replay protection
}

// stateEntry stores state validation data
type stateEntry struct {
	createdAt time.Time
}

// NewProvider initializes a new OIDC provider
func NewProvider(ctx context.Context, cfg *Config) (*Provider, error) {
	if cfg.IssuerURL == "" {
		return nil, fmt.Errorf("issuer URL is required")
	}
	if cfg.ClientID == "" {
		return nil, fmt.Errorf("client ID is required")
	}
	if cfg.RedirectURL == "" {
		return nil, fmt.Errorf("redirect URL is required")
	}

	// Perform OIDC discovery
	provider, err := oidc.NewProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create OIDC provider: %w", err)
	}

	// Configure OAuth2
	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       cfg.Scopes,
	}

	// Create ID token verifier
	verifier := provider.Verifier(&oidc.Config{
		ClientID: cfg.ClientID,
	})

	p := &Provider{
		oauth2Config: oauth2Config,
		oidcProvider: provider,
		verifier:     verifier,
		stateKey:     deriveStateKey(cfg),
	}

	// Start background cleanup of expired states
	go p.cleanupExpiredStates(ctx)

	return p, nil
}

// GenerateAuthURL generates authorization URL with a random state parameter
func (p *Provider) GenerateAuthURL() (authURL string, state string, err error) {
	state, err = p.generateState()
	if err != nil {
		return "", "", err
	}

	// Store state with timestamp
	p.states.Store(state, stateEntry{
		createdAt: time.Now(),
	})

	// Generate authorization URL
	authURL = p.oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)

	return authURL, state, nil
}

// ValidateState validates and consumes the state parameter (one-time use)
func (p *Provider) ValidateState(state string) error {
	if state == "" {
		return fmt.Errorf("state parameter is empty")
	}
	if _, used := p.usedStates.LoadOrStore(state, time.Now()); used {
		return fmt.Errorf("state parameter already used")
	}

	// Prefer one-time in-memory validation when available.
	if value, loaded := p.states.LoadAndDelete(state); loaded {
		entry := value.(stateEntry)
		if time.Since(entry.createdAt) > 10*time.Minute {
			p.usedStates.Delete(state)
			return fmt.Errorf("state parameter expired")
		}
		p.usedStates.Store(state, time.Now())
		return nil
	}

	// Fallback to stateless signature validation to support multi-instance / restart scenarios.
	if !p.validateSignedState(state, 10*time.Minute) {
		p.usedStates.Delete(state)
		return fmt.Errorf("invalid or expired state parameter")
	}
	p.usedStates.Store(state, time.Now())

	return nil
}

func deriveStateKey(cfg *Config) []byte {
	seed := cfg.ClientSecret
	if seed == "" {
		seed = cfg.ClientID + "|" + cfg.IssuerURL
	}
	sum := sha256.Sum256([]byte(seed))
	return sum[:]
}

func (p *Provider) generateState() (string, error) {
	nonce := make([]byte, 32)
	if _, err := rand.Read(nonce); err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}

	nonceB64 := base64.RawURLEncoding.EncodeToString(nonce)
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	payload := nonceB64 + "." + ts

	mac := hmac.New(sha256.New, p.stateKey)
	_, _ = mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))

	return payload + "." + sig, nil
}

func (p *Provider) validateSignedState(state string, maxAge time.Duration) bool {
	parts := strings.Split(state, ".")
	if len(parts) != 3 {
		return false
	}

	nonce := parts[0]
	ts := parts[1]
	sigHex := parts[2]

	if nonce == "" || ts == "" || sigHex == "" {
		return false
	}

	issuedAtUnix, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return false
	}

	issuedAt := time.Unix(issuedAtUnix, 0)
	now := time.Now()
	if issuedAt.After(now.Add(1 * time.Minute)) {
		return false
	}
	if now.Sub(issuedAt) > maxAge {
		return false
	}

	payload := nonce + "." + ts
	mac := hmac.New(sha256.New, p.stateKey)
	_, _ = mac.Write([]byte(payload))
	expectedSig := mac.Sum(nil)

	providedSig, err := hex.DecodeString(sigHex)
	if err != nil {
		return false
	}

	return hmac.Equal(expectedSig, providedSig)
}

// ExchangeToken exchanges authorization code for tokens
func (p *Provider) ExchangeToken(ctx context.Context, code string) (*oauth2.Token, error) {
	if code == "" {
		return nil, fmt.Errorf("authorization code is empty")
	}

	token, err := p.oauth2Config.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange token: %w", err)
	}

	return token, nil
}

// VerifyIDToken verifies the ID token signature and claims
func (p *Provider) VerifyIDToken(ctx context.Context, rawIDToken string) (*oidc.IDToken, error) {
	if rawIDToken == "" {
		return nil, fmt.Errorf("ID token is empty")
	}

	idToken, err := p.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify ID token: %w", err)
	}

	return idToken, nil
}

// cleanupExpiredStates periodically removes expired state entries
func (p *Provider) cleanupExpiredStates(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.states.Range(func(key, value interface{}) bool {
				entry := value.(stateEntry)
				if time.Since(entry.createdAt) > 10*time.Minute {
					p.states.Delete(key)
				}
				return true
			})
			p.usedStates.Range(func(key, value interface{}) bool {
				usedAt := value.(time.Time)
				if time.Since(usedAt) > 10*time.Minute {
					p.usedStates.Delete(key)
				}
				return true
			})
		}
	}
}
