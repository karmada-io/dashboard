import {FC, ReactNode} from 'react';
import {Layout as AntdLayout} from 'antd'
import {Outlet, Navigate} from 'react-router-dom'
import Header from './header';
import Sidebar from './sidebar';
import {cn} from "@/utils/cn.ts";
import {useAuth} from "@/components/auth";


const {Sider: AntdSider, Content: AntdContent} = AntdLayout;


export const MainLayout: FC = () => {
    const {authenticated} = useAuth();
    console.log('authenticated', authenticated)
    if (!authenticated) {
        return <Navigate to="/login"/>;
    }
    return <>
        <Header/>
        <AntdLayout className={cn('h-[calc(100vh-48px)]', 'overflow-hidden')}>
            <AntdSider width={256}>
                <Sidebar/>
            </AntdSider>
            <AntdContent>
                <Outlet/>
            </AntdContent>
        </AntdLayout>
    </>
}

export interface IOnlyHeaderLayout {
    children?: ReactNode;
}

export const OnlyHeaderLayout: FC<IOnlyHeaderLayout> = ({children}) => {
    return <>
        <Header/>
        <AntdLayout className={cn('h-[calc(100vh-48px)]')}>
            <AntdContent>
                {children}
            </AntdContent>
        </AntdLayout>
    </>;
}