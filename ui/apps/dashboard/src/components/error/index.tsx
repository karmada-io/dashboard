import i18nInstance from '@/utils/i18n';
import type { ResultProps } from 'antd';
import { Result } from 'antd';
import { useRouteError } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';

const ErrorBoundary = (props: ResultProps) => {
  const error = useRouteError() as Error;
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <Result
      style={{ marginTop: '50vh', transform: 'translateY(-50%)' }}
      status={'500'}
      extra={i18nInstance.t('03743b3522b7d69da1cdc44d7418ce4d')}
      {...props}
    />
  );
};

export default ErrorBoundary;
