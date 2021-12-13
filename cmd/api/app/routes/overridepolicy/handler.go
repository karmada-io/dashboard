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

package overridepolicy

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/resource/overridepolicy"
)

func handleGetOverridePolicyList(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	dataSelect := common.ParseDataSelectPathParameter(c)
	namespace := common.ParseNamespacePathParameter(c)
	k8sClient := client.InClusterClientForKarmadaAPIServer()
	overrideList, err := overridepolicy.GetOverridePolicyList(karmadaClient, k8sClient, namespace, dataSelect)
	if err != nil {
		klog.ErrorS(err, "Failed to GetOverridePolicyList")
		common.Fail(c, err)
		return
	}
	common.Success(c, overrideList)
}
func handleGetOverridePolicyDetail(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	namespace := c.Param("namespace")
	name := c.Param("overridePolicyName")
	result, err := overridepolicy.GetOverridePolicyDetail(karmadaClient, namespace, name)
	if err != nil {
		klog.ErrorS(err, "GetOverridePolicyDetail failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}
func handlePostOverridePolicy(c *gin.Context) {
	// todo precheck existence of namespace, now we tested it under scope of default, it's ok till now.
	ctx := context.Context(c)
	overridepolicyRequest := new(v1.PostOverridePolicyRequest)
	if err := c.ShouldBind(&overridepolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}
	if overridepolicyRequest.Namespace == "" {
		overridepolicyRequest.Namespace = "default"
	}

	var err error
	karmadaClient := client.InClusterKarmadaClient()
	if overridepolicyRequest.IsClusterScope {
		clusteroverridePolicy := v1alpha1.ClusterOverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &clusteroverridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterOverridePolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().Create(ctx, &clusteroverridePolicy, metav1.CreateOptions{})
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
		klog.ErrorS(err, "Failed to create OverridePolicies")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}
func handlePutOverridePolicy(c *gin.Context) {
	ctx := context.Context(c)
	overridepolicyRequest := new(v1.PutOverridePolicyRequest)
	if err := c.ShouldBind(&overridepolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}
	var err error
	karmadaClient := client.InClusterKarmadaClient()
	// todo check pp exist
	if overridepolicyRequest.IsClusterScope {
		clusteroverridePolicy := v1alpha1.ClusterOverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &clusteroverridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterOverridePolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().Update(ctx, &clusteroverridePolicy, metav1.UpdateOptions{})
	} else {
		overridePolicy := v1alpha1.OverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &overridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal OverridePolicy")
			common.Fail(c, err)
			return
		}
		var oldOverridePolicy *v1alpha1.OverridePolicy
		oldOverridePolicy, err = karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Get(ctx, overridepolicyRequest.Name, metav1.GetOptions{})
		if err == nil {
			// only spec can be updated
			overridePolicy.TypeMeta = oldOverridePolicy.TypeMeta
			overridePolicy.ObjectMeta = oldOverridePolicy.ObjectMeta
			_, err = karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Update(ctx, &overridePolicy, metav1.UpdateOptions{})
		}
	}
	if err != nil {
		klog.ErrorS(err, "Failed to update OverridePolicy")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}
func handleDeleteOverridePolicy(c *gin.Context) {
	ctx := context.Context(c)
	overridepolicyRequest := new(v1.DeleteOverridePolicyRequest)
	if err := c.ShouldBind(&overridepolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}
	var err error
	karmadaClient := client.InClusterKarmadaClient()
	if overridepolicyRequest.IsClusterScope {
		err = karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().Delete(ctx, overridepolicyRequest.Name, metav1.DeleteOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to delete ClusterOverridePolicy")
			common.Fail(c, err)
			return
		}
	} else {
		err = karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Delete(ctx, overridepolicyRequest.Name, metav1.DeleteOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to delete OverridePolicy")
			common.Fail(c, err)
			return
		}
		_ = retry.OnError(
			retry.DefaultRetry,
			func(err error) bool {
				return errors.IsNotFound(err)
			},
			func() error {
				_, getErr := karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Get(ctx, overridepolicyRequest.Name, metav1.GetOptions{})
				return getErr
			})
	}

	common.Success(c, "ok")
}

func init() {
	r := router.V1()
	r.GET("/overridepolicy", handleGetOverridePolicyList)
	r.GET("/overridepolicy/:namespace", handleGetOverridePolicyList)
	r.GET("/overridepolicy/namespace/:namespace/:overridePolicyName", handleGetOverridePolicyDetail)
	r.POST("/overridepolicy", handlePostOverridePolicy)
	r.PUT("/overridepolicy", handlePutOverridePolicy)
	r.DELETE("/overridepolicy", handleDeleteOverridePolicy)
}
