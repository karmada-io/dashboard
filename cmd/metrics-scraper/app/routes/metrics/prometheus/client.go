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

package prometheus

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	catalogTTL = 5 * time.Minute
	maxMetrics = 50
)

// Config configures the Prometheus-compatible query endpoint.
type Config struct {
	URL                string
	Timeout            time.Duration
	BearerTokenFile    string
	CAFile             string
	InsecureSkipVerify bool
}

// Client is the minimal Prometheus HTTP API client used by the dashboard.
type Client struct {
	baseURL         *url.URL
	httpClient      *http.Client
	bearerTokenFile string

	cacheMu sync.Mutex
	cache   map[string]catalogCacheEntry
}

// Handler serves Prometheus-backed metrics endpoints.
type Handler struct {
	client *Client
}

type catalogCacheEntry struct {
	expires time.Time
	items   []MetricCatalogItem
	series  []map[string]string
}

type prometheusMetadata struct {
	Type string `json:"type"`
	Help string `json:"help"`
}

type prometheusResponse struct {
	Status    string          `json:"status"`
	Data      json.RawMessage `json:"data"`
	ErrorType string          `json:"errorType"`
	Error     string          `json:"error"`
}

type prometheusMatrix struct {
	ResultType string `json:"resultType"`
	Result     []struct {
		Metric map[string]string   `json:"metric"`
		Values [][]json.RawMessage `json:"values"`
	} `json:"result"`
}

// NewClient creates a client without adding a Prometheus SDK dependency.
func NewClient(cfg Config) (*Client, error) {
	baseURL, err := url.Parse(strings.TrimRight(cfg.URL, "/"))
	if err != nil || baseURL.Scheme == "" || baseURL.Host == "" {
		return nil, fmt.Errorf("invalid prometheus URL %q", cfg.URL)
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 10 * time.Second
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: cfg.InsecureSkipVerify} // #nosec G402 -- explicit operator option
	if cfg.CAFile != "" {
		ca, readErr := os.ReadFile(cfg.CAFile)
		if readErr != nil {
			return nil, fmt.Errorf("read prometheus CA file: %w", readErr)
		}
		pool, poolErr := x509.SystemCertPool()
		if poolErr != nil {
			pool = x509.NewCertPool()
		}
		if !pool.AppendCertsFromPEM(ca) {
			return nil, fmt.Errorf("prometheus CA file contains no certificates")
		}
		tlsConfig.RootCAs = pool
	}
	transport.TLSClientConfig = tlsConfig

	return &Client{
		baseURL:         baseURL,
		httpClient:      &http.Client{Timeout: cfg.Timeout, Transport: transport},
		bearerTokenFile: cfg.BearerTokenFile,
		cache:           map[string]catalogCacheEntry{},
	}, nil
}

// NewHandler creates Prometheus-backed metrics handlers.
func NewHandler(client *Client) *Handler {
	return &Handler{client: client}
}

func (p *Client) queryRange(ctx context.Context, query string, start, end time.Time, step time.Duration) ([]Point, error) {
	var matrix prometheusMatrix
	err := p.get(ctx, "/api/v1/query_range", url.Values{
		"query": {query},
		"start": {strconv.FormatFloat(float64(start.UnixMilli())/1000, 'f', 3, 64)},
		"end":   {strconv.FormatFloat(float64(end.UnixMilli())/1000, 'f', 3, 64)},
		"step":  {strconv.FormatInt(max(int64(math.Ceil(step.Seconds())), 1), 10)},
	}, &matrix)
	if err != nil {
		return nil, err
	}
	if matrix.ResultType != "matrix" {
		return nil, fmt.Errorf("unexpected Prometheus result type %q", matrix.ResultType)
	}

	points := map[int64]float64{}
	for _, result := range matrix.Result {
		for _, pair := range result.Values {
			if len(pair) != 2 {
				continue
			}
			var timestamp float64
			var value string
			if json.Unmarshal(pair[0], &timestamp) != nil || json.Unmarshal(pair[1], &value) != nil {
				continue
			}
			number, parseErr := strconv.ParseFloat(value, 64)
			if parseErr != nil || math.IsNaN(number) || math.IsInf(number, 0) {
				continue
			}
			points[int64(timestamp*1000)] += number
		}
	}

	result := make([]Point, 0, len(points))
	for timestamp, value := range points {
		result = append(result, Point{Timestamp: time.UnixMilli(timestamp).UTC().Format(time.RFC3339), Value: value})
	}
	sortPoints(result)
	return result, nil
}

func (p *Client) series(ctx context.Context, match string, start, end time.Time) ([]map[string]string, error) {
	var result []map[string]string
	err := p.get(ctx, "/api/v1/series", url.Values{
		"match[]": {match},
		"start":   {strconv.FormatInt(start.Unix(), 10)},
		"end":     {strconv.FormatInt(end.Unix(), 10)},
	}, &result)
	return result, err
}

func (p *Client) metadata(ctx context.Context) (map[string][]prometheusMetadata, error) {
	var result map[string][]prometheusMetadata
	err := p.get(ctx, "/api/v1/metadata", nil, &result)
	return result, err
}

func (p *Client) get(ctx context.Context, path string, values url.Values, result any) error {
	endpoint := *p.baseURL
	endpoint.Path = strings.TrimRight(endpoint.Path, "/") + path
	endpoint.RawQuery = values.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return err
	}
	if p.bearerTokenFile != "" {
		token, readErr := os.ReadFile(p.bearerTokenFile)
		if readErr != nil {
			return fmt.Errorf("read prometheus bearer token: %w", readErr)
		}
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(string(token)))
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("query Prometheus: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if err != nil {
		return fmt.Errorf("read Prometheus response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("prometheus returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var envelope prometheusResponse
	if err := json.Unmarshal(body, &envelope); err != nil {
		return fmt.Errorf("decode Prometheus response: %w", err)
	}
	if envelope.Status != "success" {
		return fmt.Errorf("prometheus %s: %s", envelope.ErrorType, envelope.Error)
	}
	if err := json.Unmarshal(envelope.Data, result); err != nil {
		return fmt.Errorf("decode Prometheus data: %w", err)
	}
	return nil
}
