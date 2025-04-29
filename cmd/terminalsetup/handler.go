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

package terminalsetup

import (
	"net/http"
    "net/http/httputil"
    "net/url"

    "github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
)

/*func proxyTtydWebSocket(c *gin.Context) {
    podName := c.Param("pod")

    // Build the in-cluster URL for the pod’s service
    // Assume service is named <podName>-svc in the karmada-system namespace
    target := &url.URL{
        Scheme: "http", // Change to http or ws depending on your setup
        Host:   podName + "-svc.karmada-system.svc.cluster.local:7681", // Adjust port if necessary
        Path:   "/",
    }

    proxy := httputil.NewSingleHostReverseProxy(target)
    proxy.Director = func(req *http.Request) {
        req.URL.Scheme = target.Scheme
        req.URL.Host = target.Host
        req.URL.Path = target.Path
        req.Header.Set("X-Forwarded-Host", req.Host)
        req.Header.Set("X-Forwarded-For", c.ClientIP())
        req.Host = target.Host
    }

    proxy.ServeHTTP(c.Writer, c.Request)
}*/

func proxyTtydWebSocket(c *gin.Context) {
    podName := c.Param("pod")
    // build the target URL for the service backing that pod:
    targetURL := &url.URL{
        Scheme: "http", // uses HTTP under the hood; the proxy treats websocket upgrades specially
        Host:   podName + "-svc.karmada-system.svc.cluster.local:7681",
    }

    proxy := httputil.NewSingleHostReverseProxy(targetURL)

    // override the Director to preserve Upgrade headers and route to our target
    origDirector := proxy.Director
    proxy.Director = func(req *http.Request) {
        origDirector(req)
        // these headers should already be present from the client;
        // we just make sure they’re forwarded:
        req.Header.Set("Connection", c.Request.Header.Get("Connection"))
        req.Header.Set("Upgrade", c.Request.Header.Get("Upgrade"))
        req.Host = targetURL.Host
    }

    // Let the proxy handle the hijack / WebSocket connection
    proxy.ServeHTTP(c.Writer, c.Request)
}
// Init registers your terminal endpoints on the shared router.
func Init() {
	v1 := router.V1()
	v1.GET("/terminal", TriggerTerminal)
	v1.GET("/terminal/ws/:pod", proxyTtydWebSocket)
  }

// Init initializes the terminal routes
/*func Init() {
	r := router.V1()
	r.GET("/terminal", TriggerTerminal)
	// new “proxy the ttyd WebSocket” endpoint
    r.GET("/terminal/ws/:pod", proxyTtydWebSocket)
}*/


