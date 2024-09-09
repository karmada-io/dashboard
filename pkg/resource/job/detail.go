package job

import (
	"context"
	"github.com/karmada-io/dashboard/pkg/common/errors"
	"github.com/karmada-io/dashboard/pkg/resource/common"

	batch "k8s.io/api/batch/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sClient "k8s.io/client-go/kubernetes"
)

// JobDetail is a presentation layer view of Kubernetes Job resource.
type JobDetail struct {
	// Extends list item structure.
	Job `json:",inline"`

	// Completions specifies the desired number of successfully finished pods the job should be run with.
	Completions *int32 `json:"completions"`

	// List of non-critical errors, that occurred during resource retrieval.
	Errors []error `json:"errors"`
}

// GetJobDetail gets job details.
func GetJobDetail(client k8sClient.Interface, namespace, name string) (*JobDetail, error) {
	jobData, err := client.BatchV1().Jobs(namespace).Get(context.TODO(), name, metaV1.GetOptions{})
	if err != nil {
		return nil, err
	}

	podInfo, err := getJobPodInfo(client, jobData)
	nonCriticalErrors, criticalError := errors.ExtractErrors(err)
	if criticalError != nil {
		return nil, criticalError
	}

	job := toJobDetail(jobData, *podInfo, nonCriticalErrors)
	return &job, nil
}

func toJobDetail(job *batch.Job, podInfo common.PodInfo, nonCriticalErrors []error) JobDetail {
	return JobDetail{
		Job:         toJob(job, &podInfo),
		Completions: job.Spec.Completions,
		Errors:      nonCriticalErrors,
	}
}
