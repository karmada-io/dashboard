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

package app

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/karmada/pkg/sharedcli/klogflag"
	"github.com/spf13/cobra"
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/web/app/options"
	"github.com/karmada-io/dashboard/pkg/config"
	"github.com/karmada-io/dashboard/pkg/environment"
)

// NewWebCommand creates a *cobra.Command object with default parameters
func NewWebCommand(ctx context.Context) *cobra.Command {
	opts := options.NewOptions()
	cmd := &cobra.Command{
		Use:  "karmada-dashboard-web",
		Long: `The karmada-dashboard-web serve static files and api proxy for karmada-dashboard web ui. `,
		RunE: func(_ *cobra.Command, _ []string) error {
			// validate options
			//if errs := opts.Validate(); len(errs) != 0 {
			//	return errs.ToAggregate()
			//}
			if err := run(ctx, opts); err != nil {
				return err
			}
			return nil
		},
		Args: func(cmd *cobra.Command, args []string) error {
			for _, arg := range args {
				if len(arg) > 0 {
					return fmt.Errorf("%q does not take any arguments, got %q", cmd.CommandPath(), args)
				}
			}
			return nil
		},
	}
	fss := cliflag.NamedFlagSets{}

	genericFlagSet := fss.FlagSet("generic")
	opts.AddFlags(genericFlagSet)

	// Set klog flags
	logsFlagSet := fss.FlagSet("logs")
	klogflag.Add(logsFlagSet)

	cmd.Flags().AddFlagSet(genericFlagSet)
	cmd.Flags().AddFlagSet(logsFlagSet)
	return cmd
}

func run(ctx context.Context, opts *options.Options) error {
	klog.InfoS("Starting Karmada Dashboard API", "version", environment.Version)
	err := config.InitDashboardConfigFromMountFile(opts.DashboardConfigPath)
	if err != nil {
		return err
	}
	serve(opts)
	<-ctx.Done()
	os.Exit(0)
	return nil
}

func generateAPIProxy(remoteURL string, director func(*http.Request, *gin.Context)) (gin.HandlerFunc, error) {
	remoteEndpoint, err := url.Parse(remoteURL)
	if err != nil {
		return nil, err
	}

	return func(c *gin.Context) {
		if c.Request.Header.Get("Authorization") == "" && c.Query("Authorization") == "" {
			c.String(http.StatusUnauthorized, "Forbidden")
			c.Abort()
			return
		}
		proxy := httputil.NewSingleHostReverseProxy(remoteEndpoint)
		originalDirector := proxy.Director
		proxy.Director = func(req *http.Request) {
			originalDirector(req)
			req.Header = c.Request.Header.Clone()
			req.Host = remoteEndpoint.Host
			director(req, c)
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}, nil
}

func serve(opts *options.Options) {
	insecureAddress := fmt.Sprintf("%s:%d", opts.InsecureBindAddress, opts.InsecurePort)
	klog.V(1).InfoS("Listening and serving on", "address", insecureAddress)
	pathPrefix := config.GetDashboardConfig().PathPrefix
	klog.V(1).Infof("PathPrefix is:%s", pathPrefix)
	go func() {
		r := router.Router()
		g := r.Group(pathPrefix)
		g.StaticFS("/static", http.Dir(opts.StaticDir))
		if opts.EnableAPIProxy {
			if apiProxyFunc, err := generateAPIProxy(opts.APIProxyEndpoint, func(req *http.Request, _ *gin.Context) {
				req.URL.Path = strings.TrimPrefix(req.URL.Path, pathPrefix)
			}); err == nil {
				g.Any("/api/*path", apiProxyFunc)
			} else {
				klog.Fatalf("failed to parse api-proxy-endpoint: %v", err)
			}
		}
		if opts.EnableKubernetesDashboardAPIProxy {
			if kubernetesDashboardAPIProxyFunc, err := generateAPIProxy(opts.KubernetesDashboardAPIProxyEndpoint, func(req *http.Request, c *gin.Context) {
				memberClusterName := c.Param("memberClusterName")
				req.Header.Add("X-Member-ClusterName", memberClusterName)
				req.URL.Path = c.Param("path")
			}); err == nil {
				g.Any("/clusterapi/:memberClusterName/*path", kubernetesDashboardAPIProxyFunc)
			} else {
				klog.Fatalf("failed to parse kubernetes-dashboard-api-proxy-endpoint: %v", err)
			}
		}
		g.GET("/i18n/*path", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{})
		})
		r.NoRoute(func(c *gin.Context) {
			indexHTML := "no content"
			indexPath := path.Join(opts.StaticDir, "index.html")
			f, err := os.Open(indexPath)
			if err == nil {
				buff, readAllErr := io.ReadAll(f)
				if readAllErr == nil {
					indexHTML = string(buff)
					indexHTML = strings.ReplaceAll(indexHTML, "{{PathPrefix}}", pathPrefix)
				}
			}
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(indexHTML))
		})
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
}
