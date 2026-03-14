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
	"os"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/karmada/pkg/sharedcli/klogflag"
	"github.com/spf13/cobra"
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/options"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/assistant"                // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/auth"                     // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/cluster"                  // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/clusteroverridepolicy"    // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/clusterpropagationpolicy" // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/config"                   // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/configmap"                // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/cronjob"                  // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/daemonset"                // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/deployment"               // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/ingress"                  // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/job"                      // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member"                   // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/namespace"                // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/overridepolicy"           // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/overview"                 // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/propagationpolicy"        // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/secret"                   // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/service"                  // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/statefulset"              // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/terminal"                 // Importing route packages forces route registration
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/unstructured"             // Importing route packages forces route registration
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
	"github.com/karmada-io/dashboard/pkg/environment"
	"github.com/karmada-io/dashboard/pkg/llm"
	"github.com/karmada-io/dashboard/pkg/mcpclient"
)

// NewAPICommand creates a *cobra.Command object with default parameters
func NewAPICommand(ctx context.Context) *cobra.Command {
	opts := options.NewOptions()
	cmd := &cobra.Command{
		Use:  "karmada-dashboard-api",
		Long: `The karmada-dashboard-api provide api for karmada-dashboard web ui. It need to access host cluster apiserver and karmada apiserver internally, it will access host cluster apiserver for creating some resource like configmap in host cluster, meanwhile it will access karmada apiserver for interactiving for purpose of managing karmada-specific resources, like cluster、override policy、propagation policy and so on.`,
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

	client.InitKarmadaConfig(
		client.WithUserAgent(environment.UserAgent()),
		client.WithKubeconfig(opts.KarmadaKubeConfig),
		client.WithKubeContext(opts.KarmadaContext),
		client.WithInsecureTLSSkipVerify(opts.SkipKarmadaApiserverTLSVerify),
	)

	client.InitKubeConfig(
		client.WithUserAgent(environment.UserAgent()),
		client.WithKubeconfig(opts.KubeConfig),
		client.WithKubeContext(opts.KubeContext),
		client.WithInsecureTLSSkipVerify(opts.SkipKubeApiserverTLSVerify),
	)
	ensureAPIServerConnectionOrDie()

	// Initialize LLM configuration
	if opts.LLMAPIKey != "" {
		llmConfig := &llm.Config{
			LLMAPIKey:   opts.LLMAPIKey,
			LLMModel:    opts.LLMModel,
			LLMEndpoint: opts.LLMEndpoint,
			Timeout:     opts.LLMTimeout,
		}
		llm.InitLLMConfig(llmConfig)

		// Verify LLM client can be created
		if _, err := llm.GetLLMClient(); err != nil {
			klog.Warningf("LLM client initialization failed: %v", err)
		} else {
			klog.Infof("LLM client initialized successfully")
		}
	}

	// Initialize MCP client (optional, factory pattern)
	var mcpClient *mcpclient.MCPClient
	if opts.EnableMCP {
		var mcpOpts []mcpclient.MCPConfigOption

		if opts.MCPTransportMode == "sse" {
			mcpOpts = append(mcpOpts, mcpclient.WithSSEMode(opts.MCPSSEEndpoint))
		} else {
			karmadaMCPServerArguments := []string{
				"--karmada-kubeconfig", opts.KarmadaKubeConfig,
				"--karmada-context", opts.KarmadaContext,
			}
			if opts.SkipKarmadaApiserverTLSVerify {
				karmadaMCPServerArguments = append(karmadaMCPServerArguments, "--skip-karmada-apiserver-tls-verify")
			}
			mcpOpts = append(mcpOpts,
				mcpclient.WithStdioMode(opts.MCPServerPath),
				mcpclient.WithStdioArguments(karmadaMCPServerArguments...),
			)
		}

		var err error
		mcpClient, err = mcpclient.NewMCPClientWithOptions(mcpOpts...)
		if err != nil {
			klog.Warningf("MCP initialization failed (non-fatal): %v", err)
		} else {
			klog.Infof("MCP client initialized successfully")
		}
	}

	config.InitDashboardConfig(client.InClusterClient(), ctx.Done())
	serve(opts, mcpClient)

	// Cleanup on shutdown
	if mcpClient != nil {
		defer mcpClient.Close()
	}

	<-ctx.Done()
	os.Exit(0)
	return nil
}

func ensureAPIServerConnectionOrDie() {
	versionInfo, err := client.InClusterClient().Discovery().ServerVersion()
	if err != nil {
		klog.Fatalf("Error while initializing connection to Kubernetes apiserver. "+
			"This most likely means that the cluster is misconfigured. Reason: %s\n", err)
		os.Exit(1)
	}
	klog.InfoS("Successful initial request to the Kubernetes apiserver", "version", versionInfo.String())

	karmadaVersionInfo, err := client.InClusterKarmadaClient().Discovery().ServerVersion()
	if err != nil {
		klog.Fatalf("Error while initializing connection to Karmada apiserver. "+
			"This most likely means that the cluster is misconfigured. Reason: %s\n", err)
		os.Exit(1)
	}
	klog.InfoS("Successful initial request to the Karmada apiserver", "version", karmadaVersionInfo.String())
}

func serve(opts *options.Options, mcpClient *mcpclient.MCPClient) {
	// Add middleware to inject MCP client into context
	if mcpClient != nil {
		router.Router().Use(func(c *gin.Context) {
			c.Set("mcpClient", mcpClient)
			c.Next()
		})
		klog.Infof("MCP client middleware registered")
	}

	insecureAddress := fmt.Sprintf("%s:%d", opts.InsecureBindAddress, opts.InsecurePort)
	klog.V(1).InfoS("Listening and serving on", "address", insecureAddress)
	go func() {
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
}
