import { createInstance } from 'i18next';
import { Icons } from '@/components/icons';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

const i18nInstance = createInstance({});

export function getLang() {
  return window.localStorage.getItem('i18next-lang') || 'en-US';
}

export async function setLang(lang: string) {
  await i18nInstance.changeLanguage(lang);
  window.localStorage.setItem('i18next-lang', lang);
}

interface LangConfig {
  title: string;
  icon: JSX.Element;
  sidebarWidth: number;
}

export const supportedLangConfig: Record<string, LangConfig> = {
  'en-US': {
    title: 'English',
    icon: <Icons.en width={20} height={20} />,
    sidebarWidth: 330,
  },
  'zh-CN': {
    title: '中文',
    icon: <Icons.zh width={20} height={20} />,
    sidebarWidth: 256,
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
    case 'zh-CN':
      return zhCN;
    case 'en-US':
      return enUS;
    default:
      return enUS;
  }
}

export function getSidebarWidth(lang?: string) {
  lang = lang || getLang();
  return supportedLangConfig[lang]?.sidebarWidth || '';
}

export function capitalize(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function titleCase(value: string) {
  if (!value) return '';
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function lowerCase(value: string) {
  if (!value) return '';
  return value.toLowerCase();
}

export default i18nInstance;
