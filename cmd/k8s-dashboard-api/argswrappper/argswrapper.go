package argswrapper

import (
    "github.com/spf13/pflag"
    "k8s.io/dashboard/api/pkg/helpers"
)

var (
    argKubeConfigFile            = pflag.String("kubeconfig", "", "path to kubeconfig file with control plane location information")
    argNamespace                 = pflag.String("namespace", helpers.GetEnv("POD_NAMESPACE", "kubernetes-dashboard"), "Namespace to use when accessing Dashboard specific resources, i.e. metrics scraper service")
    argMetricsScraperServiceName = pflag.String("metrics-scraper-service-name", "kubernetes-dashboard-metrics-scraper", "name of the dashboard metrics scraper service")

    // Karmada specific flags
    argKarmadaKubeConfigFile         = pflag.String("karmada-kubeconfig", "", "path to karmada kubeconfig file with karmada control plane location information")
    argKarmadaContext                = pflag.String("karmada-context", "", "name of the karmada-kubeconfig context to use")
    argKarmadaApiserverSkipTLSVerify = pflag.Bool("karmada-apiserver-skip-tls-verify", false, "enable if connection with remote Karmada API server should skip TLS verify")
)

func init() {
    // Register flags on program start
    pflag.Parse()
}

func KarmadaKubeConfigPath() string {
    return *argKarmadaKubeConfigFile
}

func KarmadaContext() string {
    return *argKarmadaContext
}

func KarmadaApiserverSkipTLSVerify() bool {
    return *argKarmadaApiserverSkipTLSVerify
}
