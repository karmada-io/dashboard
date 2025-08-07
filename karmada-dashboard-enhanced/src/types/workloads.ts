import { ObjectMeta } from './storage';

export interface PodInfo {
  running: number;
  pending: number;
  succeeded: number;
  failed: number;
}

export interface Deployment {
  objectMeta: ObjectMeta;
  podInfo: PodInfo;
  containerImages: string[];
}

export interface StatefulSet {
  objectMeta: ObjectMeta;
  podInfo: PodInfo;
  containerImages: string[];
}

export interface DaemonSet {
  objectMeta: ObjectMeta;
  podInfo: PodInfo;
  containerImages: string[];
}

export interface Job {
  objectMeta: ObjectMeta;
  podInfo: PodInfo;
  containerImages: string[];
  completions: string;
  parallelism: number;
}

export interface CronJob {
  objectMeta: ObjectMeta;
  schedule: string;
  suspend: boolean;
  active: number;
  lastSchedule: string;
  containerImages: string[];
}

export interface Pod {
  objectMeta: ObjectMeta;
  status: string;
  restartCount: number;
  nodeName: string;
  containerImages: string[];
}

export interface DeploymentList {
  items: Deployment[];
}

export interface StatefulSetList {
  items: StatefulSet[];
}

export interface DaemonSetList {
  items: DaemonSet[];
}

export interface JobList {
  items: Job[];
}

export interface CronJobList {
  items: CronJob[];
}

export interface PodList {
  items: Pod[];
}
