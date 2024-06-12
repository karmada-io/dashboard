import {useState} from "react";
import Panel from '@/components/panel';
import {Input, Button, Segmented, TableColumnProps, Tag, Space, Table, message, Popconfirm} from "antd";
import {Icons} from "@/components/icons"
import {useQuery} from "@tanstack/react-query";
import {GetPropagationPolicies, DeletePropagationPolicy} from "@/services/propagationpolicy.ts";
import type {PropagationPolicy} from "@/services/propagationpolicy.ts";
import PropagationPolicyEditorDrawer, {PropagationPolicyEditorDrawerProps} from './propagation-policy-editor-drawer'
import {stringify} from 'yaml'
import {GetResource} from "@/services/unstructured.ts";

export type PolicyScope = 'namespace-scope' | 'cluster-scope';

const PropagationPolicyManage = () => {
    const [policyScope, setPolicyScope] = useState<PolicyScope>('namespace-scope');
    const {data, isLoading, refetch} = useQuery({
        queryKey: ['GetPropagationPolicies',policyScope],
        queryFn: async () => {
            if(policyScope === 'cluster-scope') return {
                propagationpolicys: []
            }
            const ret = await GetPropagationPolicies()
            return ret.data || {}
        },
    })
    const [editorDrawerData, setEditorDrawerData] = useState<Omit<PropagationPolicyEditorDrawerProps, 'onClose' | 'onUpdate' | 'onCreate'>>({
        open: false,
        mode: 'detail',
        name: '',
        namespace: '',
        propagationContent: ''
    })
    const columns: TableColumnProps<PropagationPolicy>[] = [
        {
            title: '命名空间',
            key: 'namespaceName',
            width: 200,
            render: (_, r) => {
                return r.objectMeta.namespace
            }
        },
        {
            title: '策略名称',
            key: 'policyName',
            width: 200,
            render: (_, r) => {
                return r.objectMeta.name
            }
        },
        {
            title: '调度器名称',
            key: 'schedulerName',
            dataIndex: 'schedulerName',
            width: 200,
        },
        {
            title: '关联集群',
            key: 'cluster',
            render: (_, r) => {
                if (!r?.clusterAffinity?.clusterNames) {
                    return '-'
                }
                return <div>
                    {
                        r.clusterAffinity.clusterNames.map(key => <Tag
                            key={`${r.objectMeta.name}-${key}`}>{key}</Tag>)
                    }
                </div>
            }
        },
        {
            title: '关联资源',
            key: 'deployments',
            render: (_, r) => {
                return r.deployments.map(d => <Tag key={`${r.objectMeta.name}-${d}`}>{d}</Tag>)
            }
        },
        {
            title: '操作',
            key: 'op',
            width: 200,
            render: (_, r) => {
                return <Space.Compact>
                    <Button
                        size={'small'} type='link'
                        onClick={async () => {
                            const ret = await GetResource({
                                name: r.objectMeta.name,
                                namespace: r.objectMeta.namespace,
                                kind: 'propagationpolicy'
                            })
                            const content = stringify(ret.data);
                            setEditorDrawerData({
                                open: true,
                                mode: 'detail',
                                name: r.objectMeta.name,
                                namespace: r.objectMeta.namespace,
                                propagationContent: content,
                            })
                        }}
                    >
                        查看
                    </Button>
                    <Button
                        size={'small'} type='link'
                        onClick={async () => {
                            const ret = await GetResource({
                                name: r.objectMeta.name,
                                namespace: r.objectMeta.namespace,
                                kind: 'propagationpolicy'
                            })
                            const content = stringify(ret.data);
                            setEditorDrawerData({
                                open: true,
                                mode: 'edit',
                                name: r.objectMeta.name,
                                namespace: r.objectMeta.namespace,
                                propagationContent: content,
                            })
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        placement="topRight"
                        title={`确认要删除${r.objectMeta.name}调度策略么`}
                        onConfirm={async () => {
                            const ret = await DeletePropagationPolicy({
                                isClusterScope: policyScope === 'cluster-scope',
                                namespace: r.objectMeta.namespace,
                                name: r.objectMeta.name,
                            })
                            if(ret.code === 200) {
                                messageApi.success('删除成功')
                                refetch()
                            }else {
                                messageApi.error('删除失败')
                            }
                        }}
                        okText="确认"
                        cancelText="取消"
                    >
                        <Button size={'small'} type='link' danger>
                            删除
                        </Button>
                    </Popconfirm>
                </Space.Compact>
            }
        }
    ]
    const [messageApi, messageContextHolder] = message.useMessage();

    function resetEditorDrawerData() {
        setEditorDrawerData({
            open: false,
            mode: 'detail',
            name: '',
            namespace: '',
            propagationContent: ''
        })
    }

    return <Panel>
        <Segmented
            value={policyScope}
            style={{marginBottom: 8}}
            onChange={(value) => setPolicyScope(value as PolicyScope)}
            options={[
                {
                    label: '命名空间级别',
                    value: 'namespace-scope',
                },
                {
                    label: '集群级别',
                    value: 'cluster-scope',
                },
            ]
            }
        />
        <div className={'flex flex-row justify-between mb-4'}>
            <Input.Search placeholder={'按命名空间搜索'} className={'w-[400px]'}/>
            <Button
                type={'primary'}
                icon={<Icons.add width={16} height={16}/>}
                className="flex flex-row items-center"
                onClick={() => {
                    setEditorDrawerData({
                        open: true,
                        mode: 'create',
                    })
                }}
            >
                {policyScope === 'namespace-scope' ? '新增调度策略' : '新增集群调度策略'}
            </Button>
        </div>
        <Table
            rowKey={(r: PropagationPolicy) => r.objectMeta.name || ''}
            columns={columns}
            loading={isLoading}
            dataSource={data?.propagationpolicys || []}
        />
        <PropagationPolicyEditorDrawer
            open={editorDrawerData.open}
            name={editorDrawerData.name}
            namespace={editorDrawerData.namespace}
            mode={editorDrawerData.mode}
            propagationContent={editorDrawerData.propagationContent}
            onClose={() => {
                setEditorDrawerData({
                    open: false,
                    mode: 'detail',
                    name: '',
                    namespace: '',
                    propagationContent: ''
                })
            }}
            onCreate={(ret) => {
                if (ret.code === 200) {
                    messageApi.success(`新增调度策略成功`)
                    resetEditorDrawerData()
                    refetch()
                } else {
                    messageApi.error(`新增调度策略失败`)
                }
            }}
            onUpdate={(ret) => {
                if (ret.code === 200) {
                    messageApi.success(`编辑调度策略成功`)
                    resetEditorDrawerData()
                    refetch()
                } else {
                    messageApi.error(`编辑调度策略失败`)
                }
            }}
        />
        {messageContextHolder}
    </Panel>
}

export default PropagationPolicyManage;