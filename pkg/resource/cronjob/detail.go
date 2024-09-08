package cronjob

import (
	"context"

	batch "k8s.io/api/batch/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sClient "k8s.io/client-go/kubernetes"
)

// CronJobDetail contains Cron Job details.
type CronJobDetail struct {
	// Extends list item structure.
	CronJob `json:",inline"`

	ConcurrencyPolicy       string `json:"concurrencyPolicy"`
	StartingDeadLineSeconds *int64 `json:"startingDeadlineSeconds"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetCronJobDetail gets Cron Job details.
func GetCronJobDetail(client k8sClient.Interface, namespace, name string) (*CronJobDetail, error) {

	rawObject, err := client.BatchV1().CronJobs(namespace).Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	cj := toCronJobDetail(rawObject)
	return &cj, nil
}

func toCronJobDetail(cj *batch.CronJob) CronJobDetail {
	return CronJobDetail{
		CronJob:                 toCronJob(cj),
		ConcurrencyPolicy:       string(cj.Spec.ConcurrencyPolicy),
		StartingDeadLineSeconds: cj.Spec.StartingDeadlineSeconds,
	}
}
