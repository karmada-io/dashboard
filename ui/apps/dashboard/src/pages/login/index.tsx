import {Alert, Button, Card, Collapse, Input, message} from "antd";
import styles from './index.module.less';
import {cn} from "@/utils/cn.ts";
import {useState} from "react";
import {Login} from "@/services/auth.ts";
import {useNavigate} from 'react-router-dom';
import {useAuth} from "@/components/auth";


const LoginPage = () => {
    const [authToken, setAuthToken] = useState('');
    const [messageApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();
    const {setToken} = useAuth();
    return (
        <div className={'h-screen w-screen  bg-[#FAFBFC]'}>
            <div className="h-full w-full flex justify-center items-center ">
                <Card
                    className={cn('w-1/2', styles['login-card'])}
                    title={
                        <div
                            className={'bg-blue-500 text-white h-[56px] flex items-center px-[16px] text-xl rounded-t-[8px]'}>
                            Karmada Dashboard
                        </div>
                    }
                >
                    {/*<Alert message="参考文档生成jwt token" type="info"/>*/}
                    <Alert
                        message={<>
                            <Collapse
                                bordered={true}
                                size="small"
                                // expandIcon={() => null}
                                // expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                                items={[
                                    {
                                        key: '1',
                                        label: "参考文档生成jwt token",
                                        children: <code>!!todo</code>
                                    }
                                ]}
                            />
                        </>}
                        type='info'
                    />

                    <Input.TextArea
                        className={"mt-4"}
                        rows={6}
                        value={authToken}
                        onChange={(v) => {
                            setAuthToken(v.target.value)
                        }}
                    />
                    <div className={"mt-4"}>
                        <Button
                            type='primary'
                            onClick={async () => {
                                try {
                                    const ret = await Login(authToken)
                                    if (ret.code === 200) {
                                        messageApi.success('登录成功，即将跳转')
                                        setTimeout(() => {
                                            setToken(authToken)
                                            navigate('/overview')
                                        }, 1000)
                                    } else {
                                        messageApi.error('登录失败，请重试')
                                    }
                                } catch (e) {
                                    messageApi.error('登录失败');
                                }
                            }}
                        >登录</Button>
                    </div>
                </Card>
            </div>
            {contextHolder}
        </div>
    )
}

export default LoginPage