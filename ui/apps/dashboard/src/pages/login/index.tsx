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

import i18nInstance from '@/utils/i18n';
import { Button, Card, Input, Segmented, Typography, message } from 'antd';
import styles from './index.module.less';
import { cn } from '@/utils/cn.ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetOIDCEnabled, GetOIDCLoginURL, Login } from '@/services/auth.ts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';

const tokenCommand = [
  'kubectl -n karmada-system get secret/karmada-dashboard-secret \\',
  '  -o go-template="{{.data.token | base64decode}}"',
].join('\n');

function normalizeToken(raw: string) {
  return raw.replace(/\s+/g, '');
}

type TokenValidationErrorKey =
  | 'token_empty'
  | 'token_too_short'
  | 'token_too_long'
  | 'token_invalid_format';

function validateJWTToken(token: string): TokenValidationErrorKey | '' {
  // Minimal client-side guardrail: keep it lightweight and avoid false certainty.
  // Server remains source of truth for token validity.
  if (!token) return 'token_empty';
  if (token.length < 20) return 'token_too_short';
  if (token.length > 8192) return 'token_too_long';

  const jwtLike = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  if (!jwtLike.test(token)) return 'token_invalid_format';

  return '';
}

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState<'jwt' | 'oidc'>('jwt');
  const [authToken, setAuthToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showTokenCommand, setShowTokenCommand] = useState(false);
  const [oidcEnabled, setOIDCEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOIDCLoading, setIsOIDCLoading] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const normalizedToken = useMemo(() => normalizeToken(authToken.trim()), [authToken]);
  const canSubmitToken = useMemo(
    () => !!normalizedToken && !isOIDCLoading && !isSubmitting,
    [normalizedToken, isOIDCLoading, isSubmitting],
  );

  useEffect(() => {
    const loadOIDCEnabled = async () => {
      try {
        const ret = await GetOIDCEnabled();
        setOIDCEnabled(ret.code === 200 && !!ret.data?.enabled);
      } catch (_) {
        setOIDCEnabled(false);
      }
    };
    void loadOIDCEnabled();
  }, []);

  const handleOIDCLogin = async () => {
    setIsOIDCLoading(true);
    try {
      const ret = await GetOIDCLoginURL();
      if (ret.code === 200 && ret.data) {
        sessionStorage.setItem('oidc_state', ret.data.state);
        window.location.href = ret.data.authUrl;
      } else {
        await messageApi.error(
          i18nInstance.t('oidc_login_failed', '企业登录暂不可用，请稍后重试'),
        );
      }
    } catch (e) {
      await messageApi.error(
        i18nInstance.t('oidc_login_error', '企业登录未完成，请重试'),
      );
    } finally {
      setIsOIDCLoading(false);
    }
  };

  const handleTokenLogin = useCallback(async () => {
    const tokenValue = normalizedToken;
    const validationErrorKey = validateJWTToken(tokenValue);
    if (validationErrorKey) {
      const validationMessage = i18nInstance.t(validationErrorKey, '令牌格式不正确，请检查后重试');
      setTokenError(validationMessage);
      await messageApi.warning(validationMessage);
      return;
    }

    setTokenError('');
    setIsSubmitting(true);
    try {
      const ret = await Login(tokenValue);
      if (ret.code === 200) {
        await messageApi.success(
          i18nInstance.t(
            '11427a1edb98cf7efe26ca229d6f2626',
            '登录成功，正在进入总览页',
          ),
        );
        setTimeout(() => {
          setToken(tokenValue);
          navigate('/overview');
        }, 800);
      } else {
        await messageApi.error(
          i18nInstance.t(
            'a831066e2d289e126ff7cbf483c3bad1',
            '令牌校验未通过，请检查后重试',
          ),
        );
      }
    } catch (e) {
      await messageApi.error(
        i18nInstance.t(
          'b6076a055fe6cc0473e0d313dc58a049',
          '登录请求失败，请稍后重试',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [normalizedToken, messageApi, navigate, setToken]);

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tokenCommand);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 1200);
      await messageApi.success(
        i18nInstance.t('token_command_copied', '令牌命令已复制'),
      );
    } catch (_) {
      await messageApi.warning(
        i18nInstance.t(
          'token_command_copy_failed',
          '复制失败，请手动复制该命令',
        ),
      );
    }
  }, [messageApi]);

  return (
    <div className={styles['login-page']}>
      <div className={styles['login-layout']}>
        <Card
          className={cn(styles['login-card'])}
          title={
            <div className={styles['login-card-title']}>
              <Typography.Title level={4} className={styles['title-text']}>
                Karmada Dashboard
              </Typography.Title>
            </div>
          }
        >
          <div className={styles['mode-switcher']}>
            <Segmented<'jwt' | 'oidc'>
              block
              value={loginMode}
              onChange={(v) => setLoginMode(v)}
              options={[
                { label: i18nInstance.t('default_login_title', '令牌登录'), value: 'jwt' },
                {
                  label: i18nInstance.t('enterprise_login_title', '企业统一登录'),
                  value: 'oidc',
                  disabled: !oidcEnabled,
                },
              ]}
            />
          </div>

          {loginMode === 'jwt' ? (
            <section className={styles['auth-section']}>
              <div className={styles['token-help-entry']}>
                <Typography.Text className={styles['token-help-label']}>
                  {i18nInstance.t('token_help_label', '没有令牌？')}
                </Typography.Text>
                <button
                  type="button"
                  className={styles['token-command-toggle']}
                  onClick={() => setShowTokenCommand((prev) => !prev)}
                >
                  {showTokenCommand
                    ? i18nInstance.t('hide_token_command', '已了解，收起命令')
                    : i18nInstance.t('show_token_command', '查看获取方式')}
                  {showTokenCommand ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              {showTokenCommand && (
                <div className={styles['command-row']}>
                  <div className={styles['token-help-wrap']}>
                    <pre className={cn(styles['token-help'], styles['token-help-block'])}>
                      <code>{tokenCommand}</code>
                    </pre>
                    <button
                      type="button"
                      className={cn(
                        styles['copy-icon-btn'],
                        copiedCommand && styles['copy-icon-btn-visible'],
                      )}
                      onClick={handleCopyCommand}
                      aria-label={copiedCommand
                        ? i18nInstance.t('copy_command_done_aria', '命令已复制')
                        : i18nInstance.t('copy_command_aria', '复制令牌命令')}
                      title={copiedCommand
                        ? i18nInstance.t('copy_command_done_aria', '命令已复制')
                        : i18nInstance.t('copy_command_aria', '复制令牌命令')}
                    >
                      {copiedCommand ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  {copiedCommand && (
                    <Typography.Text className={styles['copied-hint']}>
                      {i18nInstance.t('copied_hint', '已复制')}
                    </Typography.Text>
                  )}
                </div>
              )}
              <Input.TextArea
                data-testid="login-input"
                className={styles['login-input']}
                autoSize={{ minRows: 4, maxRows: 8 }}
                value={authToken}
                placeholder={i18nInstance.t(
                  'token_placeholder',
                  '请粘贴登录令牌',
                )}
                aria-label={i18nInstance.t('token_input_aria', '令牌登录输入框')}
                onChange={(v) => {
                  setAuthToken(v.target.value);
                  if (tokenError) {
                    setTokenError('');
                  }
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData('text');
                  if (!pasted) return;
                  const normalized = normalizeToken(pasted);
                  if (normalized !== pasted.trim()) {
                    event.preventDefault();
                    setAuthToken(normalized);
                    setTokenError('');
                  }
                }}
              />
              {tokenError && (
                <Typography.Text
                  type="danger"
                  role="alert"
                  aria-live="polite"
                  className={styles['token-error']}
                >
                  {tokenError}
                </Typography.Text>
              )}
              <div className={styles['action-row']}>
                <Button
                  type="primary"
                  data-testid="login-button"
                  loading={isSubmitting}
                  disabled={!canSubmitToken}
                  onClick={handleTokenLogin}
                >
                  {i18nInstance.t('402d19e50fff44c827a4f3b608bd5812', '登录')}
                </Button>
              </div>
            </section>
          ) : (
            <section className={cn(styles['auth-section'], styles['enterprise-section'])}>
              <Typography.Text className={styles['section-desc']}>
                {i18nInstance.t('enterprise_login_desc', '使用企业身份统一认证登录')}
              </Typography.Text>
              <div className={styles['action-row']}>
                <Button
                  type="primary"
                  data-testid="oidc-login-button"
                  loading={isOIDCLoading}
                  disabled={isSubmitting || !oidcEnabled}
                  onClick={handleOIDCLogin}
                >
                  {i18nInstance.t('enterprise_login', '企业登录')}
                </Button>
              </div>
            </section>
          )}
        </Card>
      </div>
      {contextHolder}
    </div>
  );
};

export default LoginPage;
