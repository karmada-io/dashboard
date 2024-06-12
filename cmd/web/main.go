package main

import (
	"context"
	"github.com/karmada-io/dashboard/cmd/web/app"
	"k8s.io/component-base/cli"
	"os"
)

func main() {
	ctx := context.TODO()
	cmd := app.NewWebCommand(ctx)
	code := cli.Run(cmd)
	os.Exit(code)
}
