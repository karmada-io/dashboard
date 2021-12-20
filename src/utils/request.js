import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// create an axios instance
const service = axios.create({
  headers: {
    'Content-Type': 'application/merge-patch+json'
  },
  baseURL: '/', // url = base url + request url
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 15000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    if (store.getters.token) {
      config.headers['Authorization'] = 'Bearer ' + getToken()
    }
    return config
  },
  error => {
    // do something with request error
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  response => {
    const res = response.data

    // if the custom code is not 20000, it is judged as an error.
    if (response.status !== 200 && (response.status !== 201) && (response.status !== 204)) {
      Message({
        message: res.message || 'Error',
        type: 'error',
        duration: 5 * 1000
      })
      return Promise.reject(new Error(res || 'Error'))
    } else {
      return res
    }
  },
  error => {
    console.log(`请求失败：${error}`)
    Message({
      message: `请求失败`,
      type: 'error',
      duration: 10 * 1000
    })
    if (error.response.status === 401) {
      console.log('401')
      store.dispatch('user/resetToken').then(() => {
        // location.reload()
      })
    }
    return Promise.reject(error)
  }
)

export default service
