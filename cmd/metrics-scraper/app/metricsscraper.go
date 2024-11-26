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
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"
	"net/http"
	"os"
	"github.com/karmada-io/dashboard/cmd/metrics-scraper/app/scrape"
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
	klog.InfoS("Starting Karmada Dashboard Metrics-scraper", "version", environment.Version)
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
		r.NoRoute(func(c *gin.Context) {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte("indexHtml"))
		})
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
}

func init() {
	go scrape.InitDatabase()
	// Initialize the router with modified endpoints
	r := router.V1()
	r.GET("/metrics", scrape.GetMetrics)
	r.GET("/metrics/:app_name", scrape.GetMetrics)
	r.GET("/metrics/:app_name/:pod_name", scrape.QueryMetrics)
}

// http://localhost:8000/api/v1/metrics/karmada-scheduler  //from terminal

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=metricsdetails  //from sqlite details bar

// http://localhost:8000/api/v1/metrics/karmada-scheduler/karmada-scheduler-7bd4659f9f-hh44f?type=details&mname=workqueue_queue_duration_seconds

// http://localhost:8000/api/v1/metrics?type=sync_off // to skip all metrics

// http://localhost:8000/api/v1/metrics/karmada-scheduler?type=sync_off // to skip specific metrics

