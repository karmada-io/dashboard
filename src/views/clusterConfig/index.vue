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
        { label: '集群发现', key: '1' },
        { label: '标签管理', key: '2' },
        { label: '聚合API（预留）', key: '3' },
        { label: '集群网络打通（预留）', key: '4' },
        { label: '集群身份认证（预留）', key: '5' }
      ],
      filterMap: {
        name: {
          label: ''
        }
      },
      columns: [
        [
          { prop: 'name', label: '策略名称' },
          { prop: 'status', label: '状态' },
          { prop: 'more', label: '操作', formatter: (row) => {
            return <div>
              <el-dropdown>
                <el-button size='mini' className='el-dropdown-link' icon='el-icon-more' circle>
                </el-button>
                <el-dropdown-menu slot='dropdown'>
                  <span> <el-dropdown-item> 查询</el-dropdown-item> </span>
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
