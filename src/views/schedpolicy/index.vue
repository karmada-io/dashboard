<template>
  <div>
    <el-card shadow="never">
      <el-tabs v-model="activeName" type="card" @tab-click="switchTab">
        <el-tab-pane key="propagationPolicies" :label="$t('schedpolicy.propagation')">
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
        <el-tab-pane key="overridePolicies" :label="$t('schedpolicy.override')">
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
      :title="$t('schedpolicy.details')"
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
        <el-button type="primary" @click="dialogVisible = false">{{ $t('common.close') }}</el-button>
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
            label: this.$t('clusterConfig.policy_name')
          },
          {
            prop: 'status',
            label: this.$t('common.status')
          },
          {
            prop: 'namespace',
            label: 'NAMESPACE'
          },
          { prop: 'kind', label: this.$t('schedpolicy.global')
          },
          {
            prop: 'replicaDivisionPreference',
            label: 'replicaDivisionPreference'
          },
          { prop: 'replicaSchedulingType', label: 'replicaSchedulingType' },
          { prop: 'clusterNames', label: this.$t('schedpolicy.targetCluster') },
          {
            prop: 'more',
            label: this.$t('common.operation'),
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
                        <el-dropdown-item> {this.$t('common.search')}</el-dropdown-item>
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
            label: this.$t('clusterConfig.policy_name')
          },
          {
            prop: 'status',
            label: this.$t('common.status')
          },
          {
            prop: 'namespace',
            label: 'NAMESPACE'
          },
          {
            prop: 'resourceSelectors',
            label: this.$t('schedpolicy.targetResource')
          },
          {
            prop: 'targetCluster',
            label: this.$t('schedpolicy.targetLabelName')
          },
          {
            prop: 'more',
            label: this.$t('common.operation'),
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
                        <el-dropdown-item> {this.$t('common.search')}</el-dropdown-item>
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
