package member

// Importing member route packages forces route registration
import (
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/deployment"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/namespace"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/node"
	_ "github.com/karmada-io/dashboard/cmd/api/app/routes/member/pod"
)
