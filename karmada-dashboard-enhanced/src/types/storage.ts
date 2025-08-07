export interface ObjectMeta {
  name: string;
  namespace?: string;
  creationTimestamp?: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

export interface PersistentVolume {
  objectMeta: ObjectMeta;
  capacity: {
    storage: string;
  };
  accessModes: string[];
  reclaimPolicy: string;
  storageClass: string;
  status: string;
  claim: string;
  reason: string;
}

export interface PersistentVolumeClaim {
  objectMeta: ObjectMeta;
  status: string;
  volume: string;
  capacity: {
    storage: string;
  };
  accessModes: string[];
  storageClass: string;
}

export interface StorageClass {
  objectMeta: ObjectMeta;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
}

export interface PersistentVolumeList {
  items: PersistentVolume[];
}

export interface PersistentVolumeClaimList {
  items: PersistentVolumeClaim[];
}

export interface StorageClassList {
  items: StorageClass[];
}
