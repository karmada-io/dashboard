import {FC,ReactNode} from 'react';
import {Layout as AntdLayout} from 'antd'
import {Outlet} from 'react-router-dom'
import Header from './header';
import Sidebar from './sidebar';
import {cn} from "@/utils/cn.ts";


const {Sider: AntdSider, Content: AntdContent} = AntdLayout;


export const MainLayout: FC = () => {
    return <>
        <Header/>
        <AntdLayout className={cn('h-[calc(100vh-48px)]')}>
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