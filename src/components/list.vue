<template>
  <div>
    <div v-if="filterMap" class="filter-field">
      <div v-for="(item, key) in filterMap" :key="key" class="filter-item">
        {{ item.label === '' ? '' : item.label + ':' }}
        <RenderCell
          v-if="item.render"
          :render="item.render"
          :item-key="key"
          :filter-data="filterData"
        />
        <template v-else>
          <el-select v-if="item.type === 'select'" v-model="filterData[key]">
            <el-option
              v-for="(it, idx) in item.dataSource"
              :key="key + idx"
              :label="it.label"
              :value="it.value"
            />
          </el-select>
          <el-datepicker
            v-else-if="item.type === 'date'"
            v-model="filterData[key]"
            type="date"
          />
          <template v-else-if="item.type === 'dateRange'">
            <el-date-picker
              v-model="filterData[key]"
              type="daterange"
              :range-separator="$t('common.to')"
              :start-placeholder="$t('common.startDate')"
              :end-placeholder="$t('common.endDate')"
            />
          </template>
          <el-input
            v-else
            v-model="filterData[key]"
            :placeholder="$t('common.enter')"
            @enter="onSearchClick"
          />
        </template>
      </div>
      <el-button type="primary" @click="onSearchClick"> {{ $t('common.search') }} </el-button>
      <el-button class="add-btn"> {{ $t('common.add') }} </el-button>
    </div>
    <slot name="filterBtns" />
    <el-table
      v-if="tableData.length > 0"
      ref="multipleTable"
      border
      class="multipleTable"
      :data="tableData"
      v-bind="$attrs"
      :highlight-current-row="listColumns.length > 0 && listColumns[0].type !== 'selection'"
      tooltip-effect="dark"
      style="width: 100%"
      v-on="$listeners"
    >
      <el-table-column
        v-for="(item, index) in listColumns"
        :key="index"
        :prop="item.prop"
        :label="item.label"
        :width="item.width"
        :formatter="item.formatter"
        :sortable="item.sortable"
        :show-overflow-tooltip="item.showOverflowTooltip"
        :type="item.type || ''"
      />
    </el-table>

    <el-pagination
      v-if="pagination"
      background
      :hide-on-single-page="false"
      :current-page="page"
      layout="total, prev, pager, next, jumper"
      :total="total"
      @current-change="currentChange"
    />
  </div>
</template>

<script>
export default {
  name: 'List',
  props: {
    getListAction: String, // 数据返回api
    map: Object, // 数据
    columns: Array, // 表头
    pagination: {
      // 分页
      type: Boolean,
      default: false
    },
    query: Object, // api query
    filterMap: {
      // 列表筛选
      type: Object,
      default: () => {}
    },
    defaultFilterData: {
      type: Object,
      default: () => {}
    },
    funcName: {
      // 选择方法
      type: String,
      default: ''
    },
    isRefresh: {
      // 是否定时刷新
      type: Boolean,
      default: false
    },
    tableListData: {
      type: Array
    }
  },
  data() {
    const filterData = { ...this.defaultFilterData }
    return {
      page: 1,
      limit: 10,
      total: 0,
      tableData: [],
      listColumns: [],
      filterData
    }
  },
  mounted() {
    if (this.funcName) {
      this.getList()
    } else {
      this.tableData = this.tableListData
      this.total = this.tableListData.length
    }

    this.listColumns = this.columns || this.mapToColums(this.map)
  },
  beforeDestroy() {
    clearInterval(this.timer)
    this.timer = null
  },
  methods: {
    mapToColums(map) {
      const column = []
      Object.keys(map).forEach(e => {
        if (e === 'selection' || e === 'index') {
          column.push({ type: e, key: map[e] })
        } else {
          column.push({ prop: e, label: map[e] })
        }
      })
      return column
    },
    currentChange(page) {
      this.page = page
      this.getList()
    },
    onSearchClick() {
      this.getList()
    },
    resetSearch() {
      this.filterData = {}
      this.getList()
    },
    async getList() {
      // const params = {
      //   page: this.page,
      //   limit: this.limit,
      //   ...this.query,
      //   ...this.filterData
      // }
      const ListData = await this.$HandleFunc[this.funcName]()
      this.total = ListData.total
      this.tableData = ListData.rows
    }
  }
}
</script>

<style lang="scss" scoped>
  .filter-field {
    margin-bottom: 20px;
    font-size: 0.9rem;
    .filter-item {
      margin-right: 20px;
      margin-bottom: 20px;
      .el-input {
        width: 100px;
      }
      float: left;
    }
  }
  .multipleTable {
    margin-top: 20px;
  }
  .el-pagination {
    margin-top: 15px;
    float: right;
    margin-bottom: 15px;
  }
  .add-btn {
    background: #30c0b7;
    color: white;
    border-color: #30c0b7;
  }
</style>
