import Vue from 'vue'
import Router from 'vue-router'
import i18n from '@/utils/lang/index'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: 'cluster',
    hidden: true,
    children: [
      {
        path: 'cluster',
        component: () => import('@/views/clusterManagement/index'),
        hidden: true
      }
    ]
  },
  {
    path: '/cluster/clusterManagement',
    component: Layout,
    redirect: 'clusterManagement',
    children: [
      {
        path: '',
        component: () => import('@/views/clusterManagement/index'),
        name: 'clusterManagement',
        meta: { title: i18n.t('user.clusterManagement'), icon: 'el-icon-s-finance', affix: true }
      }
    ]
  },
  {
    path: '/cluster/schedpolicy',
    component: Layout,
    redirect: 'schedpolicy',
    children: [
      {
        path: '',
        component: () => import('@/views/schedpolicy/index'),
        name: 'Schedpolicy',
        meta: { title: i18n.t('router.schedulingPolicy'), icon: 'el-icon-s-cooperation', affix: true }
      }
    ]
  },
  {
    path: '/cluster/clusterConfig',
    component: Layout,
    redirect: 'userProject',
    children: [
      {
        path: '',
        component: () => import('@/views/clusterConfig/index'),
        name: 'clusterConfig',
        meta: { title: i18n.t('router.configuration'), icon: 'el-icon-s-operation', affix: true }
      }
    ]
  }
]

const createRouter = () => new Router({
  // mode: 'history', // require service support
  mode: 'history', // 去掉url中的#
  base: '',
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
