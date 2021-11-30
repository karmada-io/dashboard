<template>
  <div>
    <el-card shadow="never">
      <div class="top-div">
        <div class="header-title">
          <img src="@/assets/clusterManage/icon.png">
          <h4>集群拓扑展示</h4>
        </div>
        <el-select v-model="value" placeholder="按标签分类">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="tag-box">
        <div v-for="(tag, index) in tagItems" :key="index + 'tag'" class="tag-div">
          <div class="tag-title">{{ tag.tagIndex }}</div>
          <div v-for="(colony, i) in tag.colonys" :key="i + 'colony'" class="tag-line">
            <div>
              <img src="@/assets/clusterManage/cluster-name.png">
              {{ colony.name }}
            </div>
            <div>CPU {{ colony.cpu }} <img src="@/assets/clusterManage/up.png"></div>
            <div>内存 {{ colony.memory }} <img src="@/assets/clusterManage/down.png"></div>
            <div>存储 {{ colony.storage }} <img src="@/assets/clusterManage/line.png"></div>
            <div>pod {{ colony.pod }} </div>
          </div>
        </div>
      </div>
    </el-card>
    <el-card shadow="never">
      集群列表
      <List
        v-if="tableListData.length>=1"
        ref="multipleTable"
        class="multipleTable"
        :columns="columns"
        :table-list-data="tableListData"
        :pagination="true"
        tooltip-effect="dark"
      />
    </el-card>
  </div>
</template>

<script>
import List from '@/components/list'
import { getClusters } from '@/api/clusterManagement'
import { strToNumber } from '@/utils/data-process'

export default {
  name: 'ProjectForm',
  components: { List },
  data() {
    return {
      createFormVisible: false,
      options: [{
        value: '111',
        label: '标签'
      }],
      value: '',
      tableListData: [],
      tagItems: [],
      columns: [
        { prop: 'name', label: '集群名称' },
        { prop: 'tag', label: '标签' },
        { prop: 'desc', label: '描述' },
        { prop: 'node', label: '可用节点/节点数' },
        { prop: 'method', label: '集群加入方式' },
        { prop: 'tactics', label: '调度策咯' },
        { prop: 'status', label: '集群状态' },
        { prop: 'version', label: 'kubernetes版本' },
        { prop: 'time', label: '创建时间' },
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
      ],
      activeName: '0'
    }
  },
  mounted() {
    this.getData()
  },
  methods: {
    getData() {
      const listResult = []
      getClusters().then(res => {
        const { items } = res
        const colonys = []
        items.forEach((n) => {
          listResult.push({
            name: n.metadata.name,
            tag: '',
            desc: '',
            node: n.status.nodeSummary ? (n.status.nodeSummary.readyNum + '/' + n.status.nodeSummary?.totalNum) : '',
            method: n.spec.syncMode,
            tactics: '',
            status: n.status.conditions.map(r => r.type).join('、'),
            version: n.status.kubernetesVersion,
            time: n.metadata.creationTimestamp
          })
          colonys.push({
            name: n.metadata.name,
            cpu: n.status.resourceSummary ? this.toChange('cpu', n.status.resourceSummary) : '-',
            memory: n.status.resourceSummary ? this.toChange('memory', n.status.resourceSummary) : '-',
            storage: n.status.resourceSummary ? this.toChange('ephemeral-storage', n.status.resourceSummary) : '-',
            pod: n.status.resourceSummary ? this.toChange('pods', n.status.resourceSummary) : '-'
          })
        })
        this.tagItems.push({
          tagIndex: '标签一',
          colonys: colonys
        })
        this.tagItems.push({
          tagIndex: '标签二',
          colonys: colonys
        })
        this.tableListData = listResult
      })
    },
    toChange(type, data) {
      let percent = '-'
      const allocated = data.allocated[type]
      const allocatable = data.allocatable[type]
      switch (type) {
        case 'cpu': {
          const current = allocated.includes('m')
            ? allocated.replace('m', '') * 0.001
            : allocated
          const all = allocatable.includes('m')
            ? allocatable.replace('m', '') * 0.001
            : allocatable
          percent = this.toPercent(current / all)
          break
        }
        case 'memory': {
          percent = this.toPercent(strToNumber(allocated) / strToNumber(allocatable))
          break
        }
        default:
          percent = this.toPercent(allocated / allocatable)
          break
      }
      return percent
    },
    toPercent(point) {
      var str = Number(point * 100).toFixed(2)
      str += '%'
      return str
    }
  }
}
</script>

<style lang="scss" scoped>
.top-div{
  display: flex;
  justify-content: space-between;
  align-items: center;
  .header-title{
    display: flex;
    width: 180px;
    justify-content: space-between;
    margin-left: 43%;
    img{
      width: 52px;
      height: 64px;
    }
  }
}
.tag-box{
  margin: 20px -0.5% 0 -0.5%;
  .tag-div{
    width: 49%;
    border: 1px solid #E5E5E5;
    display: inline-block;
    margin: 0 0.5%;
    .tag-title{
      line-height: 45px;
      background: #E5E5E5;
      font-size: 16px;
      font-family: Source Han Sans CN;
      font-weight: 400;
      color: #333333;
      text-align: center;
    }
    .tag-line{
      :first-child{border: none;}
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      border-top: 1px solid rgba(0,0,0,0.1);
      >div{
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 10px;
        width: 20%;
        justify-content: flex-start;
      }
    }
  }
}
</style>
