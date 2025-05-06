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

package main

import (
	"context"
	"os"

	"k8s.io/component-base/cli"

	"github.com/karmada-io/dashboard/cmd/api/app"
)

func main() {
	// 创建一个上下文
	ctx := context.TODO()
	// 创建一个 API 命令
	cmd := app.NewAPICommand(ctx)
	// 运行命令
	// cli.Run(cmd) 是 Kubernetes 代码库中 k8s.io/component-base/cli 包提供的一个函数，它的作用是运行一个命令行工具（cmd）并返回执行结果的退出码（exit code）。
	code := cli.Run(cmd)
	// 退出程序
	os.Exit(code)
}
