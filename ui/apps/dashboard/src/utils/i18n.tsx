/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { createInstance } from 'i18next';
import { Icons } from '@/components/icons';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { ReactNode } from 'react';

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
  icon: ReactNode;
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

export default i18nInstance;
