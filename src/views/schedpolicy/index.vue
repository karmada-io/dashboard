<template>
  <div>
    <el-card shadow="never">
      <el-tabs v-model="activeName" type="card" @tab-click="switchTab">
        <el-tab-pane key="propagationPolicies" label="分发策略">
          <List
            ref="multipleTable"
            class="multipleTable"
            :columns="columns[0]"
            func-name="getDistributionList"
            :filter-map="filterMap"
            :pagination="true"
            tooltip-effect="dark"
          />
        </el-tab-pane>
        <el-tab-pane key="overridePolicies" label="Override策略">
          <List
            ref="multipleTable"
            class="multipleTable"
            :columns="columns[1]"
            func-name="getOverrideList"
            :filter-map="filterMap"
            :pagination="true"
            tooltip-effect="dark"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
    <el-dialog
      title="详情查询"
      :visible.sync="dialogVisible"
      width="50%"
    >
      <span>
        <json-viewer
          :value="content"
          :expand-depth="5"
          copyable
          boxed
          sort
        />
      </span>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import List from '@/components/list'

export default {
  name: 'ProjectForm',
  components: { List },
  data() {
    return {
      createFormVisible: false,
      filterMap: {
        name: {
          label: ''
        }
      },
      value: '',
      activeName: 0,
      dialogVisible: false,
      content: '',
      columns: [
        [
          {
            prop: 'name',
            label: '策略名称'
          },
          {
            prop: 'status',
            label: '状态'
          },
          {
            prop: 'namespace',
            label: 'NAMESPACE'
          },
          { prop: 'kind', label: '是否全局'
          },
          {
            prop: 'replicaDivisionPreference',
            label: 'replicaDivisionPreference'
          },
          { prop: 'replicaSchedulingType', label: 'replicaSchedulingType' },
          { prop: 'clusterNames', label: '作用集群' },
          {
            prop: 'more',
            label: '操作',
            formatter: row => {
              return (
                <div>
                  <el-dropdown>
                    <el-button
                      size='mini'
                      className='el-dropdown-link'
                      icon='el-icon-more'
                      circle
                    ></el-button>
                    <el-dropdown-menu slot='dropdown'>
                      <span>
                        <el-dropdown-item> 查询</el-dropdown-item>
                      </span>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              )
            }
          }
        ],
        [
          {
            prop: 'name',
            label: '策略名称'
          },
          {
            prop: 'status',
            label: '状态'
          },
          {
            prop: 'namespace',
            label: 'NAMESPACE'
          },
          {
            prop: 'resourceSelectors',
            label: '作用资源类型/名称'
          },
          {
            prop: 'targetCluster',
            label: '作用集群标签/集群名称'
          },
          {
            prop: 'more',
            label: '操作',
            formatter: row => {
              return (
                <div>
                  <el-dropdown>
                    <el-button
                      size='mini'
                      className='el-dropdown-link'
                      icon='el-icon-more'
                      circle
                    ></el-button>
                    <el-dropdown-menu slot='dropdown'>
                      <span onClick={() => { this.dialogVisible = true; this.content = row.content }}>
                        <el-dropdown-item> 查询</el-dropdown-item>
                      </span>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              )
            }
          }
        ]
      ]
    }
  },
  methods: {
    doSearch() {
      this.$refs.multipleTable.getList()
    },
    switchTab(e) {
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
