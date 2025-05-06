// 常用工作负载 YAML 模板（带详细注释和常用字段选项）
export const workloadTemplates = [
  {
    type: 'Deployment',
    label: 'Deployment 示例',
    yaml: `# Deployment 示例，包含常用字段和详细注释
apiVersion: apps/v1  # API 版本
kind: Deployment     # 资源类型
metadata:
  name: example-deployment   # 部署名称
  namespace: default         # 命名空间
  labels:                   # 标签，可自定义
    app: example
  annotations:              # 注解，可选
    description: "示例 Deployment"
spec:
  replicas: 1               # 副本数
  selector:                 # 选择器，必须与 template.metadata.labels 匹配
    matchLabels:
      app: example
  strategy:                 # 更新策略
    type: RollingUpdate     # 支持 RollingUpdate 或 Recreate
    rollingUpdate:
      maxSurge: 1           # 滚动升级最大新增 Pod 数
      maxUnavailable: 0     # 滚动升级最大不可用 Pod 数
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: example
          image: nginx:latest
          ports:
            - containerPort: 80
          env:                # 环境变量
            - name: ENV_VAR
              value: "value"
          resources:          # 资源限制
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "250m"
              memory: "128Mi"
          volumeMounts:       # 挂载卷
            - name: data
              mountPath: /data
      volumes:                # 卷定义
        - name: data
          emptyDir: {}
      imagePullSecrets:       # 镜像拉取密钥
        - name: myregistrykey
      restartPolicy: Always   # 重启策略，Deployment 通常为 Always
`,
  },
  {
    type: 'Statefulset',
    label: 'StatefulSet 示例',
    yaml: `# StatefulSet 示例，包含常用字段和详细注释
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: example-statefulset
  namespace: default
  labels:
    app: example
spec:
  serviceName: "example"      # 必须指定，提供网络标识
  replicas: 1
  selector:
    matchLabels:
      app: example
  updateStrategy:             # 更新策略
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: example
          image: nginx:latest
          ports:
            - containerPort: 80
          env:
            - name: ENV_VAR
              value: "value"
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "250m"
              memory: "128Mi"
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          emptyDir: {}
      imagePullSecrets:
        - name: myregistrykey
      restartPolicy: Always
  volumeClaimTemplates:       # 存储声明模板
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
`,
  },
  {
    type: 'Daemonset',
    label: 'DaemonSet 示例',
    yaml: `# DaemonSet 示例，包含常用字段和详细注释
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: example-daemonset
  namespace: default
  labels:
    app: example
spec:
  selector:
    matchLabels:
      app: example
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: example
          image: nginx:latest
          ports:
            - containerPort: 80
          env:
            - name: ENV_VAR
              value: "value"
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "250m"
              memory: "128Mi"
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          emptyDir: {}
      imagePullSecrets:
        - name: myregistrykey
      restartPolicy: Always
`,
  },
  {
    type: 'Job',
    label: 'Job 示例',
    yaml: `# Job 示例，包含常用字段和详细注释
apiVersion: batch/v1
kind: Job
metadata:
  name: example-job
  namespace: default
  labels:
    app: example
spec:
  completions: 1              # 需要完成的 Pod 数
  parallelism: 1              # 并行 Pod 数
  backoffLimit: 6             # 失败重试次数
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: example
          image: busybox
          command: ["echo", "Hello World"]
          env:
            - name: ENV_VAR
              value: "value"
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
            requests:
              cpu: "250m"
              memory: "128Mi"
      restartPolicy: Never
      imagePullSecrets:
        - name: myregistrykey
`,
  },
  {
    type: 'Cronjob',
    label: 'CronJob 示例',
    yaml: `# CronJob 示例，包含常用字段和详细注释
apiVersion: batch/v1
kind: CronJob
metadata:
  name: example-cronjob
  namespace: default
  labels:
    app: example
spec:
  schedule: "*/1 * * * *"      # 定时任务表达式
  concurrencyPolicy: Allow     # 并发策略：Allow/Forbid/Replace
  suspend: false               # 是否暂停
  successfulJobsHistoryLimit: 3 # 保留成功任务历史数
  failedJobsHistoryLimit: 1     # 保留失败任务历史数
  jobTemplate:
    spec:
      completions: 1
      parallelism: 1
      backoffLimit: 6
      template:
        metadata:
          labels:
            app: example
        spec:
          containers:
            - name: example
              image: busybox
              command: ["echo", "Hello from CronJob"]
              env:
                - name: ENV_VAR
                  value: "value"
              resources:
                limits:
                  cpu: "500m"
                  memory: "256Mi"
                requests:
                  cpu: "250m"
                  memory: "128Mi"
          restartPolicy: OnFailure
          imagePullSecrets:
            - name: myregistrykey
`,
  },
]; 