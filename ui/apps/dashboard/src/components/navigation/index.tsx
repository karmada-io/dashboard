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

import { FC, CSSProperties } from 'react';
import styles from './index.module.less';
import karmadaLogo from '@/assets/karmada-logo.svg';
import {
  setLang,
  getLangIcon,
  getLang,
  supportedLangConfig,
  getLangTitle,
} from '@/utils/i18n';
import { Dropdown } from 'antd';
import { Icons } from '@/components/icons';

export interface IUserInfo {
  id: number;
  username: string;
  avatar: string;
}

interface INavigationProps {
  headerStyle?: CSSProperties;
  usePlaceholder?: boolean;
  brandText?: string;
  userInfo?: IUserInfo;
  onTerminalClick?: () => void;
}

const Navigation: FC<INavigationProps> = (props) => {
  const {
    headerStyle = {},
    usePlaceholder = true,
    brandText = 'Karmada Dashboard',
    userInfo,
    onTerminalClick,
  } = props;
  return (
    <>
      <div className={styles.navbar}>
        <div className={styles.header} style={headerStyle}>
          <div className={styles.left}>
            <div className={styles.brand}>
              <div className={styles.logoWrap}>
                <img className={styles.logo} src={karmadaLogo} />
              </div>
              <div className={styles.text}>{brandText}</div>
            </div>
          </div>
          <div className={styles.center}>
            {/* placeholder for center element */}
          </div>
          <div className={styles.right}>
            {/* extra components */}

            {/* karmada web-terminal */}
            <Icons.terminal
              width={20}
              height={20}
              className={styles.terminalIcon}
              onClick={() => onTerminalClick?.()}
            />

            {/* i18n switch */}
            <div className={styles.extra}>
              <Dropdown
                menu={{
                  onClick: async (v) => {
                    await setLang(v.key);
                    window.location.reload();
                  },
                  selectedKeys: [getLang()],
                  items: Object.keys(supportedLangConfig).map((lang) => {
                    return {
                      key: lang,
                      label: getLangTitle(lang),
                    };
                  }),
                }}
                placement="bottomLeft"
                arrow
              >
                <div>{getLangIcon(getLang())}</div>
              </Dropdown>
            </div>

            {/* user info */}
            {userInfo && (
              <div className={styles.userWrap}>
                <div className={styles.user}>
                  <img src={userInfo?.avatar} className={styles.avatar} />
                </div>
              </div>
            )}
          </div>
        </div>
        {usePlaceholder && <div className={styles.placeholder} />}
      </div>
    </>
  );
};
export default Navigation;
