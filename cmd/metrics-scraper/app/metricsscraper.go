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
	"github.com/spf13/cobra"
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"
	"os"

	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
	"github.com/karmada-io/dashboard/pkg/environment"
	"github.com/karmada-io/karmada/pkg/sharedcli/klogflag"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/router"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/routes/metrics"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/options"
)

// NewMetricsScraperCommand creates a *cobra.Command object with default parameters
func NewMetricsScraperCommand(ctx context.Context) *cobra.Command {
	opts := options.NewOptions()
	cmd := &cobra.Command{
		Use:  "karmada-dashboard-metrics-scraper",
		Long: `The karmada-dashboard-metrics-scraper responsible for scraping and visualizing the metrics of karmada components. `,
		RunE: func(cmd *cobra.Command, args []string) error {
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
	serve(opts)
	go scrape.InitDatabase()
	
	config.InitDashboardConfig(client.InClusterClient(), ctx.Done())
	select {
	case <-ctx.Done():
		os.Exit(0)
	}
	return nil
}

func serve(opts *options.Options) {
	insecureAddress := fmt.Sprintf("%s:%d", opts.InsecureBindAddress, opts.InsecurePort)
	klog.V(1).InfoS("Listening and serving on", "address", insecureAddress)
	go func() {
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
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

func init() {
	r := router.V1() 
	r.GET("/metrics", metrics.GetMetrics)
	r.GET("/metrics/:app_name", metrics.GetMetrics)
	r.GET("/metrics/:app_name/:pod_name", metrics.QueryMetrics)
}

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=metricsdetails  //from sqlite details bar

// http://localhost:8000/api/v1/metrics/karmada-scheduler/karmada-scheduler-7bd4659f9f-hh44f?type=details&mname=workqueue_queue_duration_seconds

// http://localhost:8000/api/v1/metrics?type=sync_off // to skip all metrics

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=sync_off // to skip specific metrics
