<template>
  <div class="projectInfo">
    <el-card shadow="never">
      <el-tabs v-model="activeName" type="card" @tab-click="switchTab">
        <el-tab-pane v-for="item in tabMapOptions" :key="item.key" :label="item.label">
          <List
            ref="multipleTable"
            class="multipleTable"
            :columns="columns[0]"
            func-name="getClustersList"
            :filter-map="filterMap"
            :pagination="true"
            tooltip-effect="dark"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
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
      tabMapOptions: [
        { label: this.$t('clusterConfig.discovery'), key: '1' },
        { label: this.$t('clusterConfig.label'), key: '2' },
        { label: this.$t('clusterConfig.aggregation'), key: '3' },
        { label: this.$t('clusterConfig.network'), key: '4' },
        { label: this.$t('clusterConfig.authentication'), key: '5' }
      ],
      filterMap: {
        name: {
          label: ''
        }
      },
      columns: [
        [
          { prop: 'name', label: this.$t('clusterConfig.policy_name') },
          { prop: 'status', label: this.$t('common.status') },
          { prop: 'more', label: this.$t('common.operation'), formatter: (row) => {
            return <div>
              <el-dropdown>
                <el-button size='mini' className='el-dropdown-link' icon='el-icon-more' circle>
                </el-button>
                <el-dropdown-menu slot='dropdown'>
                  <span> <el-dropdown-item> {this.$t('common.search')}</el-dropdown-item> </span>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          } }
        ]
      ],
      activeName: '1'
    }
  },
  methods: {
    doSearch() {
      this.$refs.multipleTable.getList()
    },
    switchTab(e) {
      // const tab = this.tabList[e.index]
      // if (this.$route.path.indexOf(tab) === -1) {
      //   this.$router.push(tab)
      // }
    }
  }
}
</script>

<style lang="scss" scoped>
.projectInfo{
  text-align: left;
}
.create-btn{
  float: right;
  margin-top: -35px;
}
</style>
