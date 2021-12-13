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

package propagationpolicy

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/resource/clusteroverridepolicy"
)

func handleGetClusterOverridePolicyList(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	dataSelect := common.ParseDataSelectPathParameter(c)
	clusterOverrideList, err := clusteroverridepolicy.GetClusterOverridePolicyList(karmadaClient, dataSelect)
	if err != nil {
		klog.ErrorS(err, "Failed to GetClusterOverridePolicyList")
		common.Fail(c, err)
		return
	}
	common.Success(c, clusterOverrideList)
}

func handleGetClusterOverridePolicyDetail(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	name := c.Param("clusterOverridePolicyName")
	result, err := clusteroverridepolicy.GetClusterOverridePolicyDetail(karmadaClient, name)
	if err != nil {
		klog.ErrorS(err, "GetClusterOverridePolicyDetail failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handlePostClusterOverridePolicy(c *gin.Context) {
	ctx := context.Context(c)
	overridepolicyRequest := new(v1.PostOverridePolicyRequest)
	if err := c.ShouldBind(&overridepolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}

	var err error
	karmadaClient := client.InClusterKarmadaClient()
	if overridepolicyRequest.IsClusterScope {
		clusterOverridePolicy := v1alpha1.ClusterOverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &clusterOverridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterOverridePolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().Create(ctx, &clusterOverridePolicy, metav1.CreateOptions{})
	} else {
		overridePolicy := v1alpha1.OverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &overridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal OverridePolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Create(ctx, &overridePolicy, metav1.CreateOptions{})
	}
	if err != nil {
		klog.ErrorS(err, "Failed to create OverridePolicy")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func init() {
	r := router.V1()
	r.GET("/clusteroverridepolicy", handleGetClusterOverridePolicyList)
	r.GET("/clusteroverridepolicy/:clusterOverridePolicyName", handleGetClusterOverridePolicyDetail)
	r.POST("/clusteroverridepolicy", handlePostClusterOverridePolicy)
}
