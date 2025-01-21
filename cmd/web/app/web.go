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
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	"github.com/karmada-io/dashboard/cmd/web/app/options"
	"github.com/karmada-io/dashboard/pkg/config"
	"github.com/karmada-io/dashboard/pkg/environment"
	"github.com/karmada-io/karmada/pkg/sharedcli/klogflag"
	"github.com/spf13/cobra"
	"io"
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"strings"
)

// NewWebCommand creates a *cobra.Command object with default parameters
func NewWebCommand(ctx context.Context) *cobra.Command {
	opts := options.NewOptions()
	cmd := &cobra.Command{
		Use:  "karmada-dashboard-web",
		Long: `The karmada-dashboard-web serve static files and api proxy for karmada-dashboard web ui. `,
		RunE: func(cmd *cobra.Command, args []string) error {
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
	config.InitDashboardConfigFromMountFile(opts.DashboardConfigPath)
	serve(opts)
	select {
	case <-ctx.Done():
		os.Exit(0)
	}
	return nil
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
		if opts.EnableApiProxy {
			//	https://karmada-apiserver.karmada-system.svc.cluster.local:5443
			g.Any("/api/*path", func(c *gin.Context) {
				remote, _ := url.Parse(opts.ApiProxyEndpoint)
				proxy := httputil.NewSingleHostReverseProxy(remote)
				proxy.Director = func(req *http.Request) {
					req.Header = c.Request.Header
					req.Host = remote.Host
					req.URL.Scheme = remote.Scheme
					req.URL.Host = remote.Host
					req.URL.Path = strings.TrimPrefix(req.URL.Path, pathPrefix)
				}
				proxy.ServeHTTP(c.Writer, c.Request)
			})
		}
		// TODO:
		// currently we only mock the return i18n json, this feature will be implemented by ospp2024
		// https://summer-ospp.ac.cn/org/prodetail/245c40338?lang=zh&list=pro
		g.GET("/i18n/*path", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{})
		})
		r.NoRoute(func(c *gin.Context) {
			indexHtml := "no content"
			indexPath := path.Join(opts.StaticDir, "index.html")
			f, err := os.Open(indexPath)
			if err == nil {
				buff, readAllErr := io.ReadAll(f)
				if readAllErr == nil {
					indexHtml = string(buff)
					indexHtml = strings.ReplaceAll(indexHtml, "{{PathPrefix}}", pathPrefix)
				}
			}
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(indexHtml))
		})
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
}
