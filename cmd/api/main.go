package main

import (
	"context"
	"github.com/karmada-io/dashboard/cmd/api/app"
	"k8s.io/component-base/cli"
	"os"
)

func main() {
	ctx := context.TODO()
	cmd := app.NewApiCommand(ctx)
	code := cli.Run(cmd)
	os.Exit(code)
}
