{{/*
Expand the name of the chart.
*/}}
{{- define "karmada-dashboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Extract the namespace of the chart.
*/}}
{{- define "karmada-dashboard.namespace" -}}
{{- default .Release.Namespace -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "karmada-dashboard.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "karmada-dashboard.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "karmada-dashboard.labels" -}}
helm.sh/chart: {{ include "karmada-dashboard.chart" . }}
{{ include "karmada-dashboard.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "karmada-dashboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "karmada-dashboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Karmada-dashboard-api labels
*/}}
{{- define "karmada-dashboard.api.labels" -}}
{{ include "karmada-dashboard.labels" . }}
app: {{ include "karmada-dashboard.name" . }}-api
{{- end -}}


{{/*
Return the proper karmada search image name
*/}}
{{- define "karmada-dashboard.api.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.api.image "global" .Values.global) }}
{{- end -}}


{{/*
Return the proper karmada search image name
*/}}
{{- define "karmada-dashboard.web.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.web.image "global" .Values.global) }}
{{- end -}}

{{/*
Karmada-dashboard-web labels
*/}}
{{- define "karmada-dashboard.web.labels" -}}
{{ include "karmada-dashboard.labels" . }}
app: {{ include "karmada-dashboard.name" . }}-web
{{- if .Values.web.labels }}
{{- range $key, $value := .Values.web.labels }}
{{ $key }}: {{ $value }}
{{- end }}
{{- end }}
{{- end -}}


{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "karmada-dashboard.imagePullSecrets" -}}
{{ include "common.images.pullSecrets" (dict "images" (list .Values.api.image .Values.web.image) "global" .Values.global) }}
{{- end -}}
