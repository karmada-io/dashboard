import Vue from 'vue'
import Cookies from 'js-cookie'
import JsonViewer from 'vue-json-viewer'
import Element from 'element-ui'
import './styles/element-variables.scss'

import '@/styles/index.scss' // global css
import App from './App'
import store from './store'
import router from './router'

import * as echarts from 'echarts'

import './icons' // icon
import './permission' // permission control

import HandleFunc from '@/utils/get-Kar-List' // global filters

Vue.prototype.$echarts = echarts
Vue.prototype.$HandleFunc = HandleFunc

Vue.use(Element, {
  size: Cookies.get('size') || 'small' // set element-ui default size
})
Vue.use(JsonViewer)
Vue.config.productionTip = false
new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})
