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

package db

const (
	// Namespace is the namespace of karmada.
	// Namespace 是 karmada 的命名空间
	Namespace = "karmada-system"
	// KarmadaAgent is the name of karmada agent.
	// KarmadaAgent 是 karmada 代理的名称
	KarmadaAgent = "karmada-agent"
	// KarmadaScheduler is the name of karmada scheduler.
	// KarmadaScheduler 是 karmada 调度器的名称
	KarmadaScheduler = "karmada-scheduler"
	// KarmadaSchedulerEstimator is the name of karmada scheduler estimator.
	// KarmadaSchedulerEstimator 是 karmada 调度器估计器的名称
	KarmadaSchedulerEstimator = "karmada-scheduler-estimator"
	// KarmadaControllerManager is the name of karmada controller manager.
	// KarmadaControllerManager 是 karmada 控制器管理器的名称
	KarmadaControllerManager = "karmada-controller-manager"
	// SchedulerPort is the port of karmada scheduler.
	// SchedulerPort 是 karmada 调度器的端口
	SchedulerPort = "10351"
	// ControllerManagerPort is the port of karmada controller manager.
	// ControllerManagerPort 是 karmada 控制器管理器的端口
	ControllerManagerPort = "8080"
)
