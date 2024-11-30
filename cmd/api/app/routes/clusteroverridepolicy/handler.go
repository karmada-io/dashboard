package propagationpolicy

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/karmada-io/dashboard/cmd/api/app/router"
	v1 "github.com/karmada-io/dashboard/cmd/api/app/types/api/v1"
	"github.com/karmada-io/dashboard/cmd/api/app/types/common"
	"github.com/karmada-io/dashboard/pkg/client"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/resource/clusteroverridepolicy"
	"github.com/karmada-io/karmada/pkg/apis/policy/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"
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

func handlePutClusterOverridePolicy(c *gin.Context) {
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
		clusterOverridePolicy := v1alpha1.ClusterOverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &clusterOverridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal ClusterOverridePolicy")
			common.Fail(c, err)
			return
		}
		_, err = karmadaClient.PolicyV1alpha1().ClusterOverridePolicies().Update(ctx, &clusterOverridePolicy, metav1.UpdateOptions{})
	} else {
		overridePolicy := v1alpha1.OverridePolicy{}
		if err = yaml.Unmarshal([]byte(overridepolicyRequest.OverrideData), &overridePolicy); err != nil {
			klog.ErrorS(err, "Failed to unmarshal OverridePolicy")
			common.Fail(c, err)
			return
		}
		var oldPropagationPolicy *v1alpha1.OverridePolicy
		oldPropagationPolicy, err = karmadaClient.PolicyV1alpha1().OverridePolicies(overridepolicyRequest.Namespace).Get(ctx, overridepolicyRequest.Name, metav1.GetOptions{})
		if err == nil {
			// only spec can be updated
			overridePolicy.TypeMeta = oldPropagationPolicy.TypeMeta
			overridePolicy.ObjectMeta = oldPropagationPolicy.ObjectMeta
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

func handleDeleteClusterOverridePolicy(c *gin.Context) {
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
		err = retry.OnError(
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
	r.GET("/clusteroverridepolicy", handleGetClusterOverridePolicyList)
	r.GET("/clusteroverridepolicy/:clusterOverridePolicyName", handleGetClusterOverridePolicyDetail)
	r.POST("/clusteroverridepolicy", handlePostClusterOverridePolicy)
}
