/*
Copyright 2026 The Karmada Authors.

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

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { OIDCCallback } from '@/services/auth';
import { useAuth } from '@/components/auth';
import i18nInstance from '@/utils/i18n';
import styles from './callback.module.less';

const processedOIDCCallbacks = new Set<string>();

const OIDCCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const storedState = sessionStorage.getItem('oidc_state');

      if (!code || !state) {
        setError(
          i18nInstance.t(
            'oidc_missing_params',
            '登录参数不完整，请重新发起企业登录',
          ),
        );
        return;
      }

      if (state !== storedState) {
        setError(
          i18nInstance.t(
            'oidc_invalid_state',
            '登录状态已失效，请重新发起企业登录',
          ),
        );
        sessionStorage.removeItem('oidc_state');
        return;
      }

      const callbackKey = `${code}:${state}`;
      if (processedOIDCCallbacks.has(callbackKey)) {
        return;
      }
      processedOIDCCallbacks.add(callbackKey);

      try {
        const ret = await OIDCCallback(code, state);
        sessionStorage.removeItem('oidc_state');

        if (ret.code === 200 && ret.data?.token) {
          setToken(ret.data.token);
          navigate('/overview');
        } else {
          setError(
            i18nInstance.t('oidc_callback_failed', '企业登录未完成，请重试'),
          );
        }
      } catch (e) {
        sessionStorage.removeItem('oidc_state');
        setError(i18nInstance.t('oidc_callback_error', '企业登录请求失败，请重试'));
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken]);

  if (error) {
    return (
      <div className={styles['callback-page']}>
        <Result
          className={styles['callback-card']}
          status="error"
          title={i18nInstance.t('oidc_login_failed_title', '企业登录失败')}
          subTitle={error}
          extra={
            <a href="/login">
              {i18nInstance.t('back_to_login', '返回登录并重试')}
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles['callback-page']}>
      <Spin size="large" tip={i18nInstance.t('oidc_processing', '正在校验登录状态...')} />
    </div>
  );
};

export default OIDCCallbackPage;
