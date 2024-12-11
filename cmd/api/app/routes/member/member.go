package member

// Importing member route packages forces route registration
import (
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/configmap"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/cronjob"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/daemonset"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/deployment"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/ingress"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/job"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/namespace"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/node"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/pod"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/secret"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/service"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/statefulset"
)
