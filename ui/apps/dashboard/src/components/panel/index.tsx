import {FC, ReactNode, useMemo} from 'react';
import {useMatches} from "react-router-dom";
import {Breadcrumb} from 'antd'
import {IRouteObjectHandle} from '@/routes/route.tsx'
import * as React from "react";

interface IPanelProps {
    children: ReactNode
}

interface MenuItem {
    key?: React.Key;
    title?: React.ReactNode;
    label?: React.ReactNode;
    path?: string;
    href?: string;
}

const Panel: FC<IPanelProps> = (props) => {
    const {children} = props;
    const matches = useMatches()
    const breadcrumbs = useMemo(() => {
        if (!matches || matches.length === 0) return [] as MenuItem[]
        return matches
            .filter(m => Boolean(m.handle))
            .map(m => {
                const {isPage, sidebarName} = (m.handle as IRouteObjectHandle);
                const pathname = m.pathname
                return {
                    title: isPage && pathname ? <a>{sidebarName}</a>: sidebarName
                }

            }) as MenuItem[]
    }, [matches])
    return (
        <div className='w-full h-full px-[30px] py-[20px] box-border bg-[#FAFBFC]'>
            <div className='w-full h-full bg-white box-border p-[12px] overflow-y-scroll'>
                <Breadcrumb
                    className='mb-4'
                    items={breadcrumbs}
                />
                {children}
            </div>
        </div>
    )
}

export default Panel