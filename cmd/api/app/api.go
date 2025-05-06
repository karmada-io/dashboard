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

	"github.com/karmada-io/karmada/pkg/sharedcli/klogflag"
	"github.com/spf13/cobra"
	cliflag "k8s.io/component-base/cli/flag"
	"k8s.io/klog/v2"

	"github.com/karmada-io/dashboard/cmd/api/app/options"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
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
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/unstructured"             // Importing route packages forces route registration
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/config"
	"github.com/karmada-io/dashboard/pkg/environment"
)

// NewAPICommand creates a *cobra.Command object with default parameters
// NewAPICommand 创建一个 *cobra.Command 对象，并设置默认参数
func NewAPICommand(ctx context.Context) *cobra.Command {
	// 创建一个 options 对象
	opts := options.NewOptions()
	// 创建一个 cobra.Command 对象
	cmd := &cobra.Command{
		// Use 是 cobra.Command 的 Use 方法，用于设置命令的名称
		Use:  "karmada-dashboard-api",
		Long: `The karmada-dashboard-api provide api for karmada-dashboard web ui. It need to access host cluster apiserver and karmada apiserver internally, it will access host cluster apiserver for creating some resource like configmap in host cluster, meanwhile it will access karmada apiserver for interactiving for purpose of managing karmada-specific resources, like cluster、override policy、propagation policy and so on.`,
		// RunE 是 cobra.Command 的 Run 方法，用于执行命令
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
		// Args 是 cobra.Command 的 Args 方法，用于验证命令参数
		Args: func(cmd *cobra.Command, args []string) error {
			// 如果命令参数不为空，则返回错误，用于防止用户输入子命令参数
			for _, arg := range args {
				if len(arg) > 0 {
					return fmt.Errorf("%q does not take any arguments, got %q", cmd.CommandPath(), args)
				}
			}
			return nil
		},
	}
	// 创建一个命令行标志集
	// cliflag.NamedFlagSets 是一个包含多个标志集的结构体，用于存储命令行标志
	fss := cliflag.NamedFlagSets{}
	// 创建一个通用的标志集
	// FlagSet returns the flag set with the given name and adds it to the ordered name list if it is not in there yet.
	// FlagSet 返回给定名称的标志集，并将其添加到有序名称列表中，如果它不在那里。
	genericFlagSet := fss.FlagSet("generic")
	// 添加通用标志
	opts.AddFlags(genericFlagSet)

	// Set klog flags
	// 创建一个 klog 标志集
	logsFlagSet := fss.FlagSet("logs")
	// 添加 klog 标志
	klogflag.Add(logsFlagSet)
	// 添加通用标志和 klog 标志到命令行
	cmd.Flags().AddFlagSet(genericFlagSet)
	cmd.Flags().AddFlagSet(logsFlagSet)
	return cmd
}

func run(ctx context.Context, opts *options.Options) error {
	// klog 是 karmada 的日志库，这里使用 klog 打印日志 (k8s.io/klog/v2)
	// 基础日志
	// klog.Info("普通信息")
	// klog.Error("错误信息")

	// 结构化日志
	// klog.InfoS("Starting Karmada Dashboard API", "version", environment.Version)

	// 分级日志
	// klog.V(1).Info("详细日志信息")
	klog.InfoS("Starting Karmada Dashboard API", "version", environment.Version)

	// client 是 karmada 的客户端库，这里使用 client 初始化 karmada 的配置 (github.com/karmada-io/dashboard/pkg/client)
	client.InitKarmadaConfig(
		// 设置用户代理
		client.WithUserAgent(environment.UserAgent()),
		// 设置 karmada 的 kubeconfig
		client.WithKubeconfig(opts.KarmadaKubeConfig),
		// 设置 karmada 的 context
		client.WithKubeContext(opts.KarmadaContext),
		// 设置 karmada 的 insecure tls skip verify
		client.WithInsecureTLSSkipVerify(opts.SkipKarmadaApiserverTLSVerify),
	)

	// 初始化 kubernetes 的 kubeconfig
	client.InitKubeConfig(
		// 设置用户代理
		client.WithUserAgent(environment.UserAgent()),
		// 设置 kubernetes 的 kubeconfig
		client.WithKubeconfig(opts.KubeConfig),
		// 设置 kubernetes 的 context
		client.WithKubeContext(opts.KubeContext),
		// 设置 kubernetes 的 insecure tls skip verify
		client.WithInsecureTLSSkipVerify(opts.SkipKubeApiserverTLSVerify),
	)
	// 确保 API 服务器连接或退出
	ensureAPIServerConnectionOrDie()
	// 启动服务
	serve(opts)
	// 初始化 dashboard 的配置
	config.InitDashboardConfig(client.InClusterClient(), ctx.Done())
	// 等待上下文结束
	<-ctx.Done()
	// 退出程序
	os.Exit(0)
	return nil
}

// 确保 API 服务器连接或退出
func ensureAPIServerConnectionOrDie() {
	// 获取 Kubernetes API 服务器版本信息
	versionInfo, err := client.InClusterClient().Discovery().ServerVersion()
	if err != nil {
		klog.Fatalf("Error while initializing connection to Kubernetes apiserver. "+
			"This most likely means that the cluster is misconfigured. Reason: %s\n", err)
		os.Exit(1)
	}
	klog.InfoS("Successful initial request to the Kubernetes apiserver", "version", versionInfo.String())

	// 获取 Karmada API 服务器版本信息
	karmadaVersionInfo, err := client.InClusterKarmadaClient().Discovery().ServerVersion()
	if err != nil {
		klog.Fatalf("Error while initializing connection to Karmada apiserver. "+
			"This most likely means that the cluster is misconfigured. Reason: %s\n", err)
		os.Exit(1)
	}
	klog.InfoS("Successful initial request to the Karmada apiserver", "version", karmadaVersionInfo.String())
}

// 启动服务
func serve(opts *options.Options) {
	// 设置 insecure 地址
	insecureAddress := fmt.Sprintf("%s:%d", opts.InsecureBindAddress, opts.InsecurePort)
	// 打印日志
	klog.V(1).InfoS("Listening and serving on", "address", insecureAddress)
	// 启动服务
	go func() {
		// 启动服务
		klog.Fatal(router.Router().Run(insecureAddress))
	}()
}
