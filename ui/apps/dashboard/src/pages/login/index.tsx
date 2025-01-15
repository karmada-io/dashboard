import i18nInstance from '@/utils/i18n';
import { Alert, Button, Card, Collapse, Input, message } from 'antd';
import styles from './index.module.less';
import { cn } from '@/utils/cn.ts';
import { useState } from 'react';
import { Login } from '@/services/auth.ts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth';

const LoginPage = () => {
  const [authToken, setAuthToken] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const { setToken } = useAuth();
  return (
    <div className={'h-screen w-screen  bg-[#FAFBFC]'}>
      <div className="h-full w-full flex justify-center items-center ">
        <Card
          className={cn('w-1/2', styles['login-card'])}
          title={
            <div
              className={
                'bg-blue-500 text-white h-[56px] flex items-center px-[16px] text-xl rounded-t-[8px]'
              }
            >
              Karmada Dashboard
            </div>
          }
        >
          {/*<Alert message="参考文档生成jwt token" type="info"/>*/}
          <Alert
            message={
              <>
                <Collapse
                  bordered={true}
                  size="small"
                  // expandIcon={() => null}
                  // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                  items={[
                    {
                      key: '1',
                      label: i18nInstance.t(
                        '11fa53ed08b11d4753c29bbc8c8fee64',
                        '参考文档生成jwt token',
                      ),
                      children: <code>!!todo</code>,
                    },
                  ]}
                />
              </>
            }
            type="info"
          />

          <Input.TextArea
            className={'mt-4'}
            rows={6}
            value={authToken}
            onChange={(v) => {
              setAuthToken(v.target.value);
            }}
          />

          <div className={'mt-4'}>
            <Button
              type="primary"
              onClick={async () => {
                try {
                  const ret = await Login(authToken);
                  if (ret.code === 200) {
                    await messageApi.success(
                      i18nInstance.t(
                        '11427a1edb98cf7efe26ca229d6f2626',
                        '登录成功，即将跳转',
                      ),
                    );
                    setTimeout(() => {
                      setToken(authToken);
                      navigate('/overview');
                    }, 1000);
                  } else {
                    await messageApi.error(
                      i18nInstance.t(
                        'a831066e2d289e126ff7cbf483c3bad1',
                        '登录失败，请重试',
                      ),
                    );
                  }
                } catch (e) {
                  await messageApi.error(
                    i18nInstance.t(
                      'b6076a055fe6cc0473e0d313dc58a049',
                      '登录失败',
                    ),
                  );
                }
              }}
            >
              {i18nInstance.t('402d19e50fff44c827a4f3b608bd5812', '登录')}
            </Button>
          </div>
        </Card>
      </div>
      {contextHolder}
    </div>
  );
};

export default LoginPage;
