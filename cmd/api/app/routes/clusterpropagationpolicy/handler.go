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
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/resource/clusterpropagationpolicy"
)

func handleGetClusterPropagationPolicyList(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	dataSelect := common.ParseDataSelectPathParameter(c)
	clusterPropagationList, err := clusterpropagationpolicy.GetClusterPropagationPolicyList(karmadaClient, dataSelect)
	if err != nil {
		klog.ErrorS(err, "Failed to GetClusterPropagationPolicyList")
		common.Fail(c, err)
		return
	}
	common.Success(c, clusterPropagationList)
}

func handleGetClusterPropagationPolicyDetail(c *gin.Context) {
	karmadaClient := client.InClusterKarmadaClient()
	name := c.Param("clusterPropagationPolicyName")
	result, err := clusterpropagationpolicy.GetClusterPropagationPolicyDetail(karmadaClient, name)
	if err != nil {
		klog.ErrorS(err, "GetClusterPropagationPolicyDetail failed")
		common.Fail(c, err)
		return
	}
	common.Success(c, result)
}

func handlePostClusterPropagationPolicy(c *gin.Context) {
	ctx := context.Context(c)
	propagationpolicyRequest := new(v1.PostPropagationPolicyRequest)
	if err := c.ShouldBind(&propagationpolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}

	var err error
	karmadaClient := client.InClusterKarmadaClient()
	if propagationpolicyRequest.IsClusterScope {
		clusterPropagationPolicy := v1alpha1.ClusterPropagationPolicy{}
		if err = yaml.Unmarshal([]byte(propagationpolicyRequest.PropagationData), &clusterPropagationPolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterPropagationPolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Create(ctx, &clusterPropagationPolicy, metav1.CreateOptions{})
	} else {
		propagationPolicy := v1alpha1.PropagationPolicy{}
		if err = yaml.Unmarshal([]byte(propagationpolicyRequest.PropagationData), &propagationPolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal PropagationPolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().PropagationPolicies(propagationpolicyRequest.Namespace).Create(ctx, &propagationPolicy, metav1.CreateOptions{})
	}
	if err != nil {
		klog.ErrorS(err, "Failed to create PropagationPolicy")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}

func handlePutClusterPropagationPolicy(c *gin.Context) {
	ctx := context.Context(c)
	propagationpolicyRequest := new(v1.PutPropagationPolicyRequest)
	if err := c.ShouldBind(&propagationpolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}
	var err error
	karmadaClient := client.InClusterKarmadaClient()
	// todo check pp exist
	if propagationpolicyRequest.IsClusterScope {
		clusterPropagationPolicy := v1alpha1.ClusterPropagationPolicy{}
		if err = yaml.Unmarshal([]byte(propagationpolicyRequest.PropagationData), &clusterPropagationPolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterPropagationPolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Update(ctx, &clusterPropagationPolicy, metav1.UpdateOptions{})
	} else {
		propagationPolicy := v1alpha1.PropagationPolicy{}
		if err = yaml.Unmarshal([]byte(propagationpolicyRequest.PropagationData), &propagationPolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal PropagationPolicy")
			common.Fail(c, err)
			return
		}
		var oldPropagationPolicy *v1alpha1.PropagationPolicy
		oldPropagationPolicy, err = karmadaClient.PolicyV1alpha1().PropagationPolicies(propagationpolicyRequest.Namespace).Get(ctx, propagationpolicyRequest.Name, metav1.GetOptions{})
		if err == nil {
			// only spec can be updated
			propagationPolicy.TypeMeta = oldPropagationPolicy.TypeMeta
			propagationPolicy.ObjectMeta = oldPropagationPolicy.ObjectMeta
			_, err = karmadaClient.PolicyV1alpha1().PropagationPolicies(propagationpolicyRequest.Namespace).Update(ctx, &propagationPolicy, metav1.UpdateOptions{})
		}
	}
	if err != nil {
		klog.ErrorS(err, "Failed to update PropagationPolicy")
		common.Fail(c, err)
		return
	}
	common.Success(c, "ok")
}
func handleDeleteClusterPropagationPolicy(c *gin.Context) {
	ctx := context.Context(c)
	propagationpolicyRequest := new(v1.DeletePropagationPolicyRequest)
	if err := c.ShouldBind(&propagationpolicyRequest); err != nil {
		common.Fail(c, err)
		return
	}
	var err error
	karmadaClient := client.InClusterKarmadaClient()
	if propagationpolicyRequest.IsClusterScope {
		err = karmadaClient.PolicyV1alpha1().ClusterPropagationPolicies().Delete(ctx, propagationpolicyRequest.Name, metav1.DeleteOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to delete PropagationPolicy")
			common.Fail(c, err)
			return
		}
	} else {
		err = karmadaClient.PolicyV1alpha1().PropagationPolicies(propagationpolicyRequest.Namespace).Delete(ctx, propagationpolicyRequest.Name, metav1.DeleteOptions{})
		if err != nil {
			klog.ErrorS(err, "Failed to delete PropagationPolicy")
			common.Fail(c, err)
			return
		}
		_ = retry.OnError(
			retry.DefaultRetry,
			func(err error) bool {
				return errors.IsNotFound(err)
			},
			func() error {
				_, getErr := karmadaClient.PolicyV1alpha1().PropagationPolicies(propagationpolicyRequest.Namespace).Get(ctx, propagationpolicyRequest.Name, metav1.GetOptions{})
				return getErr
			})
	}

	common.Success(c, "ok")
}

func init() {
	r := router.V1()
	r.GET("/clusterpropagationpolicy", handleGetClusterPropagationPolicyList)
	r.GET("/clusterpropagationpolicy/:clusterPropagationPolicyName", handleGetClusterPropagationPolicyDetail)
	r.POST("/clusterpropagationpolicy", handlePostClusterPropagationPolicy)
}
