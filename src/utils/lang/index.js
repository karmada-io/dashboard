import Vue from 'vue'
import VueI18n from 'vue-i18n'
import enLocale from 'element-ui/lib/locale/lang/en'
import zhLocale from 'element-ui/lib/locale/lang/zh-CN'

Vue.use(VueI18n)

// 多语言
const i18n = new VueI18n({
  locale: (function() {
    if (localStorage.getItem('lang')) {
      return localStorage.getItem('lang')
    }
    return 'zh'
  }()),
  messages: {
    'zh': Object.assign(require('@/utils/lang/zh'), zhLocale), // 中文语言包
    'en': Object.assign(require('@/utils/lang/en'), enLocale) // 英文语言包
  }
})

export default i18n