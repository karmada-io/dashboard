import { createInstance } from 'i18next';
import { Icons } from '@/components/icons';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

const i18nInstance = createInstance({});

export function getLang() {
  return window.localStorage.getItem('i18next-lang') || 'en';
}

export async function setLang(lang: string) {
  await i18nInstance.changeLanguage(lang);
  window.localStorage.setItem('i18next-lang', lang);
}

interface LangConfig {
  title: string;
  icon: JSX.Element;
}

export const supportedLangConfig: Record<string, LangConfig> = {
  en: {
    title: 'English',
    icon: <Icons.en width={20} height={20} />,
  },
  zh: {
    title: '中文',
    icon: <Icons.zh width={20} height={20} />,
  },
};

export function getLangIcon(lang: string) {
  return supportedLangConfig[lang]?.icon || null;
}

export function getLangTitle(lang: string) {
  return supportedLangConfig[lang]?.title || '';
}

export function getAntdLocale(lang?: string) {
  lang = lang || getLang();
  switch (lang) {
    case 'zh_CN':
      return zhCN;
    case 'en_US':
      return enUS;
    default:
      return enUS;
  }
}

export default i18nInstance;
