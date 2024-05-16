# TODO

this file is used to record status of refactor & feature implementing of karmada dashboard

status: prd/doc -> pending -> doing -> done

stage:

- stage1: for some basic features of karmada dashboard, provide instructions to install karmada dashboard on
  karmada-host cluster, implementing essential features like management of cluster、 propagationpolicy、overridepolicy and
  kubernetes resources which are supported by karmada
- stage2: improve experience，including DX、UX, like implementing more powerful features like basic config、advanced config
  for dashboard, design addon system, improve the ecosystem of dashboard, make the integration with cloud native
  components more easily.

| module                     | sub_module                | document | api               | ui                | due | stage  |
|----------------------------|---------------------------|----------|-------------------|-------------------|-----|--------|
| overview                   | -                         | -        | @warjiang/pending | @warjiang/done    | -   | stage1 |
| cluster-manage             | cluster                   | -        | @warjiang/done    | @warjiang/done    | -   | stage1 |
| multicloud-policy-manage   | propagationpolicy         | -        | @warjiang/done    | @warjiang/done    | -   | stage1 |
|                            | cluster-propagationpolicy | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | overridepolicy            | -        | @ospp2024/pending | @ospp2024/pending | -   | stage1 |
|                            | cluster-overridepolicy    | -        | @ospp2024/pending | @ospp2024/pending | -   | stage1 |
| multicloud-resource-manage | namespace                 | -        | @warjiang/doing   | @warjiang/doing   | -   | stage1 |
|                            | workload/deployment       | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | workload/statefulset      | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | workload/daemonset        | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | workload/job              | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | workload/cronJob          | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | service/ingress           | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | service/service           | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | config/configmap          | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | config/secret             | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
| basic-config               | oem                       | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | upgrade                   | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | karmada-config            | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | registry                  | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | helm                      | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
| advanced-config            | reschedule                | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | permission                | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | failover                  | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
| addon                      | buildin                   | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
|                            | thirdparty                | -        | @warjiang/prd     | @warjiang/prd     | -   | stage2 |
| auth                       | login                     | -        | @warjiang/doing   | @warjiang/doing   | -   | stage1 |
| misc                       | i18n                      | -        | @ospp2024/doc     | @ospp2024/doc     | -   | stage1 |
|                            | helm-chart                | -        | @warjiang/pending | @warjiang/pending | -   | stage1 |
|                            | raw-manifest              | -        | @warjiang/doing   | @warjiang/doing   | -   | stage1 |

