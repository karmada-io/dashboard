/*
Copyright 2026 The Karmada Authors.

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

package informer

import (
	workv1alpha1 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha1"
	workv1alpha2 "github.com/karmada-io/karmada/pkg/apis/work/v1alpha2"
	karmadaclientset "github.com/karmada-io/karmada/pkg/generated/clientset/versioned"
	karmadainformers "github.com/karmada-io/karmada/pkg/generated/informers/externalversions"
	"k8s.io/client-go/tools/cache"
	"k8s.io/klog/v2"
)

const (
	// ResourceBindingByOwnerUID indexes ResourceBindings by ownerReferences UID.
	ResourceBindingByOwnerUID = "byOwnerUID"
	// WorkByRBName indexes Works by annotation resourcebinding.karmada.io/name.
	WorkByRBName = "byRBName"
)

var factory karmadainformers.SharedInformerFactory

// Init starts a SharedInformerFactory with custom indexers and waits for cache sync.
func Init(karmadaClient karmadaclientset.Interface, stopper <-chan struct{}) {
	factory = karmadainformers.NewSharedInformerFactory(karmadaClient, 0)

	rbInformer := factory.Work().V1alpha2().ResourceBindings().Informer()
	if err := rbInformer.AddIndexers(cache.Indexers{
		ResourceBindingByOwnerUID: func(obj interface{}) ([]string, error) {
			rb := obj.(*workv1alpha2.ResourceBinding)
			var keys []string
			for _, ref := range rb.OwnerReferences {
				keys = append(keys, string(ref.UID))
			}
			return keys, nil
		},
	}); err != nil {
		klog.Warningf("Failed to add ResourceBinding indexer: %v", err)
	}

	workInformer := factory.Work().V1alpha1().Works().Informer()
	if err := workInformer.AddIndexers(cache.Indexers{
		WorkByRBName: func(obj interface{}) ([]string, error) {
			work := obj.(*workv1alpha1.Work)
			if name := work.Annotations["resourcebinding.karmada.io/name"]; name != "" {
				return []string{name}, nil
			}
			return nil, nil
		},
	}); err != nil {
		klog.Warningf("Failed to add Work indexer: %v", err)
	}

	factory.Start(stopper)
	factory.WaitForCacheSync(stopper)
	klog.InfoS("Karmada shared informer factory started and synced")
}

// ResourceBindingIndexer returns the ResourceBinding indexer.
func ResourceBindingIndexer() cache.Indexer {
	return factory.Work().V1alpha2().ResourceBindings().Informer().GetIndexer()
}

// WorkIndexer returns the Work indexer.
func WorkIndexer() cache.Indexer {
	return factory.Work().V1alpha1().Works().Informer().GetIndexer()
}
