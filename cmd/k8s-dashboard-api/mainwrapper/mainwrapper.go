package mainwrapper

import (
    "crypto/tls"
    "fmt"
    "net/http"
    "time"
    "context"

    "k8s.io/klog/v2"

    "k8s.io/dashboard/api/pkg/args"
    "k8s.io/dashboard/api/pkg/environment"
    "k8s.io/dashboard/api/pkg/handler"
    "k8s.io/dashboard/certificates"
    karmadaclient "github.com/karmada-io/dashboard/pkg/client"
    "k8s.io/dashboard/clientwrapper"
)


func WrapperHandler(w http.ResponseWriter, r *http.Request) {
    clusterName := r.Header.Get("X-Member-ClusterName")
    if clusterName == "" {
        clusterName = "default"
    }

    client, err := clientwrapper.Client(r)
    if err != nil {
        http.Error(w, "Failed to create client: "+err.Error(), http.StatusInternalServerError)
        return
    }

    ctx := context.WithValue(r.Context(), "clientKey", client)
    r = r.WithContext(ctx)

    handler.ServeHTTP(w, r)
}


func Main() {
    klog.InfoS("Starting Kubernetes Dashboard API (Wrapper) with Karmada Integration", "version", environment.Version)

    karmadaclient.InitKarmadaConfig(
        karmadaclient.WithUserAgent(environment.UserAgent()),
        karmadaclient.WithKubeconfig(args.KarmadaKubeConfigPath()),
        karmadaclient.WithKubeContext(args.KarmadaContext()),
        karmadaclient.WithInsecureTLSSkipVerify(args.KarmadaApiserverSkipTLSVerify()),
    )

    if !args.IsProxyEnabled() {
        ensureAPIServerConnectionOrDie()
    } else {
        klog.InfoS("Running with proxy enabled")
    }

    // Setup server and handlers (reuse upstream handlers or wrap as needed)
    http.HandleFunc("/api", WrapperHandler)

    // Load certificates if needed
    certs := certificates.LoadCertificatesOrDie()
    serveTLS(certs)
}

func ensureAPIServerConnectionOrDie() {
    karmadaVersionInfo, err := karmadaclient.InClusterKarmadaClient().Discovery().ServerVersion()
    if err != nil {
        klog.ErrorS(err, "Failed to connect to Karmada apiserver")
        panic(fmt.Errorf("failed to connect to Karmada apiserver: %w", err))
    }
    klog.InfoS("Successful initial request to the Karmada apiserver", "version", karmadaVersionInfo.String())
}

func serveTLS(certificates []tls.Certificate) {
    server := &http.Server{
        Addr:         ":8443",
        TLSConfig:    &tls.Config{Certificates: certificates},
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }
    klog.Fatal(server.ListenAndServeTLS("", ""))
}


