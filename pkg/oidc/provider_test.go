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
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestValidateState_InMemoryOneTime(t *testing.T) {
	p := &Provider{stateKey: []byte("test-key")}

	state, err := p.generateState()
	if err != nil {
		t.Fatalf("generate state failed: %v", err)
	}
	p.states.Store(state, stateEntry{createdAt: time.Now()})

	if err := p.ValidateState(state); err != nil {
		t.Fatalf("first validate should pass: %v", err)
	}
	if err := p.ValidateState(state); err == nil {
		t.Fatalf("second validate should fail for one-time in-memory state")
	}
}

func TestValidateState_StatelessFallback(t *testing.T) {
	p := &Provider{stateKey: []byte("test-key")}

	state, err := p.generateState()
	if err != nil {
		t.Fatalf("generate state failed: %v", err)
	}

	if err := p.ValidateState(state); err != nil {
		t.Fatalf("stateless validation should pass: %v", err)
	}
}

func TestValidateState_StatelessExpired(t *testing.T) {
	p := &Provider{stateKey: []byte("test-key")}

	nonce := "bm9uY2U"
	ts := strconv.FormatInt(time.Now().Add(-11*time.Minute).Unix(), 10)
	payload := nonce + "." + ts

	mac := hmac.New(sha256.New, p.stateKey)
	_, _ = mac.Write([]byte(payload))
	sigHex := hex.EncodeToString(mac.Sum(nil))
	state := payload + "." + sigHex

	if p.validateSignedState(state, 10*time.Minute) {
		t.Fatalf("expired state should fail")
	}
}

func TestValidateState_ConcurrentReplayBlocked(t *testing.T) {
	p := &Provider{stateKey: []byte("test-key")}

	state, err := p.generateState()
	if err != nil {
		t.Fatalf("generate state failed: %v", err)
	}

	const workers = 32
	var wg sync.WaitGroup
	wg.Add(workers)

	var successes atomic.Int32
	start := make(chan struct{})

	for i := 0; i < workers; i++ {
		go func() {
			defer wg.Done()
			<-start
			if err := p.ValidateState(state); err == nil {
				successes.Add(1)
			}
		}()
	}

	close(start)
	wg.Wait()

	if got := successes.Load(); got != 1 {
		t.Fatalf("concurrent ValidateState should succeed exactly once, got %d", got)
	}
}
