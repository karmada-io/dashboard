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
import { FC } from 'react';
import { Form, Input, InputNumber, Radio, Select, Space, Tooltip, Typography } from 'antd';
import { parse } from 'yaml';
import _ from 'lodash';
import { IResponse } from '@/services/base.ts';
import BaseForm from './base-form';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CronjobFormProps {
  onOk: (ret: IResponse<any>) => Promise<void>;
  onCancel: () => Promise<void> | void;
}

/**
 * CronJob表单组件
 */
const CronjobForm: FC<CronjobFormProps> = (props) => {
  const { onOk, onCancel } = props;

  // 默认表单值
  const defaultValues = {
    name: '',
    namespace: 'default',
    image: 'busybox:latest',
    command: 'echo "Hello from CronJob"',
    containerName: '',
    pullPolicy: 'IfNotPresent',
    cpuLimit: '500m',
    memoryLimit: '256Mi',
    cpuRequest: '250m',
    memoryRequest: '128Mi',
    schedule: '0 * * * *',
    scheduleType: 'custom',
    concurrencyPolicy: 'Allow',
    successfulJobsHistoryLimit: 3,
    failedJobsHistoryLimit: 1,
    suspend: false,
    startingDeadlineSeconds: '',
    completions: 1,
    parallelism: 1,
    backoffLimit: 6,
    restartPolicy: 'Never',
    labels: 'app=cronjob',
    hostNetwork: false,
    dnsPolicy: 'ClusterFirst',
    nodeSelector: '',
    tolerations: '',
  };

  // 预设的Cron表达式
  const cronPresets = [
    { label: '每分钟', value: '* * * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每天午夜', value: '0 0 * * *' },
    { label: '每天上午8点', value: '0 8 * * *' },
    { label: '每周一上午8点', value: '0 8 * * 1' },
    { label: '每月1号午夜', value: '0 0 1 * *' },
  ];

  // 根据表单数据生成YAML
  const generateYaml = (values: any, template: any) => {
    let yamlObj = parse(template.yaml);
    
    // 设置基础信息
    _.set(yamlObj, 'metadata.name', values.name);
    _.set(yamlObj, 'metadata.namespace', values.namespace);
    
    // 设置标签和注释
    if (Object.keys(values.labels).length > 0) {
      _.set(yamlObj, 'metadata.labels', values.labels);
      _.set(yamlObj, 'spec.jobTemplate.spec.template.metadata.labels', values.labels);
    }
    
    if (Object.keys(values.annotations).length > 0) {
      _.set(yamlObj, 'metadata.annotations', values.annotations);
      _.set(yamlObj, 'spec.jobTemplate.spec.template.metadata.annotations', values.annotations);
    }
    
    // 设置CronJob特性
    _.set(yamlObj, 'spec.schedule', values.schedule);
    _.set(yamlObj, 'spec.concurrencyPolicy', values.concurrencyPolicy);
    _.set(yamlObj, 'spec.suspend', values.suspend);
    _.set(yamlObj, 'spec.successfulJobsHistoryLimit', values.successfulJobsHistoryLimit);
    _.set(yamlObj, 'spec.failedJobsHistoryLimit', values.failedJobsHistoryLimit);
    
    if (values.startingDeadlineSeconds) {
      _.set(yamlObj, 'spec.startingDeadlineSeconds', parseInt(values.startingDeadlineSeconds));
    }
    
    // 设置Job特性
    _.set(yamlObj, 'spec.jobTemplate.spec.completions', values.completions);
    _.set(yamlObj, 'spec.jobTemplate.spec.parallelism', values.parallelism);
    _.set(yamlObj, 'spec.jobTemplate.spec.backoffLimit', values.backoffLimit);
    
    // 设置容器信息
    const containerName = values.containerName || values.name;
    _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].name', containerName);
    _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].image', values.image);
    
    // 设置镜像拉取策略
    if (values.pullPolicy) {
      _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].imagePullPolicy', values.pullPolicy);
    }
    
    // 设置命令和参数
    if (values.command) {
      const cmdArray = values.command.split(' ').filter(Boolean);
      if (cmdArray.length > 0) {
        _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].command', cmdArray);
      }
    }
    
    if (values.args) {
      const argsArray = values.args.split(' ').filter(Boolean);
      if (argsArray.length > 0) {
        _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].args', argsArray);
      }
    }
    
    // 设置环境变量
    if (values.envVars && values.envVars.length > 0) {
      _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].env', values.envVars);
    }
    
    // 设置资源限制
    if (values.cpuRequest || values.memoryRequest || values.cpuLimit || values.memoryLimit) {
      const resources: any = {
        limits: {},
        requests: {},
      };
      
      if (values.cpuLimit) resources.limits.cpu = values.cpuLimit;
      if (values.memoryLimit) resources.limits.memory = values.memoryLimit;
      if (values.cpuRequest) resources.requests.cpu = values.cpuRequest;
      if (values.memoryRequest) resources.requests.memory = values.memoryRequest;
      
      _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.containers[0].resources', resources);
    }
    
    // 设置重启策略
    _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.restartPolicy', values.restartPolicy);
    
    // 设置网络配置
    if (values.hostNetwork !== undefined) {
      _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.hostNetwork', values.hostNetwork);
    }
    
    if (values.dnsPolicy) {
      _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.dnsPolicy', values.dnsPolicy);
    }
    
    // 设置节点选择器
    if (values.nodeSelector) {
      const nodeSelectorObj: Record<string, string> = {};
      const pairs = values.nodeSelector.split(',');
      
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((item: string) => item.trim());
        if (key && value) {
          _.set(nodeSelectorObj, key, value);
        }
      });
      
      if (Object.keys(nodeSelectorObj).length > 0) {
        _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.nodeSelector', nodeSelectorObj);
      }
    }
    
    // 设置容忍度
    if (values.tolerations) {
      const tolerationsArray: Array<{
        key: string;
        operator: string;
        value: string;
        effect: string;
      }> = [];
      const pairs = values.tolerations.split(',');
      
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((item: string) => item.trim());
        if (key && value) {
          tolerationsArray.push({
            key,
            operator: 'Equal',
            value,
            effect: 'NoSchedule',
          });
        }
      });
      
      if (tolerationsArray.length > 0) {
        _.set(yamlObj, 'spec.jobTemplate.spec.template.spec.tolerations', tolerationsArray);
      }
    }
    
    return yamlObj;
  };

  // 定时调度步骤
  const CronScheduleStep = (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>定时任务配置</h4>
        <Text type="secondary">按Cron表达式定期执行的任务</Text>
      </div>
      
      <Form.Item 
        name="scheduleType" 
        label={i18nInstance.t('调度方式', '调度方式')}
      >
        <Radio.Group>
          <Radio value="preset">使用预设</Radio>
          <Radio value="custom">自定义Cron表达式</Radio>
        </Radio.Group>
      </Form.Item>
      
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => 
          prevValues.scheduleType !== currentValues.scheduleType
        }
      >
        {({ getFieldValue, setFieldValue }) => {
          const scheduleType = getFieldValue('scheduleType');
          if (scheduleType === 'preset') {
            return (
              <Form.Item 
                name="schedulePreset" 
                label={i18nInstance.t('预设选项', '预设选项')}
                rules={[{ required: true, message: '请选择预设值' }]}
              >
                <Select
                  options={cronPresets}
                  placeholder="请选择预设值"
                  onChange={(value) => {
                    setFieldValue('schedule', value);
                  }}
                />
              </Form.Item>
            );
          }
          return (
            <Form.Item 
              name="schedule" 
              label={
                <Space>
                  <span>{i18nInstance.t('Cron表达式', 'Cron表达式')}</span>
                  <Tooltip title="Cron表达式格式: * * * * * 依次表示分钟(0-59), 小时(0-23), 日期(1-31), 月份(1-12), 星期(0-6,0表示周日)">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: '请输入Cron表达式' }]}
            >
              <Input placeholder="例如: 0 * * * *" />
            </Form.Item>
          );
        }}
      </Form.Item>

      <Form.Item 
        name="concurrencyPolicy" 
        label={
          <Space>
            <span>{i18nInstance.t('并发策略', '并发策略')}</span>
            <Tooltip title="Allow: 允许同时运行多个Job, Forbid: 禁止并发运行, Replace: 新Job会替换旧的未完成Job">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
      >
        <Radio.Group>
          <Radio value="Allow">允许并发 (Allow)</Radio>
          <Radio value="Forbid">禁止并发 (Forbid)</Radio>
          <Radio value="Replace">替换旧任务 (Replace)</Radio>
        </Radio.Group>
      </Form.Item>
      
      <Form.Item 
        name="suspend" 
        label={i18nInstance.t('暂停调度', '暂停调度')}
        tooltip="暂停后将不会创建新的任务"
      >
        <Radio.Group>
          <Radio value={true}>是</Radio>
          <Radio value={false}>否</Radio>
        </Radio.Group>
      </Form.Item>
      
      <Space>
        <Form.Item 
          name="successfulJobsHistoryLimit" 
          label={i18nInstance.t('保留成功历史数', '保留成功历史数')}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item 
          name="failedJobsHistoryLimit" 
          label={i18nInstance.t('保留失败历史数', '保留失败历史数')}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Space>
      
      <Form.Item 
        name="startingDeadlineSeconds" 
        label={i18nInstance.t('启动期限(秒)', '启动期限(秒)')}
        tooltip="任务必须在预定时间点之后的这段时间内启动，否则视为失败"
      >
        <InputNumber min={0} placeholder="不设限制" />
      </Form.Item>
    </Space>
  );

  // Job配置部分
  const JobInfoStep = (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <div style={{ marginBottom: 8, marginTop: 8 }}>
        <h4 style={{ margin: 0 }}>Job 配置</h4>
      </div>
      
      <Form.Item 
        name="command" 
        label={i18nInstance.t('执行命令', '执行命令')}
        rules={[{ required: true, message: '请输入执行命令' }]}
      >
        <Input.TextArea placeholder='例如: echo "Hello from CronJob"' autoSize={{ minRows: 2, maxRows: 4 }} />
      </Form.Item>
      
      <Space>
        <Form.Item 
          name="completions" 
          label={i18nInstance.t('完成次数', '完成次数')}
          rules={[{ required: true, message: '请输入完成次数' }]}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item 
          name="parallelism" 
          label={i18nInstance.t('并行数量', '并行数量')}
          rules={[{ required: true, message: '请输入并行数量' }]}
          style={{ minWidth: 160 }}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Space>
      
      <Form.Item 
        name="backoffLimit" 
        label={i18nInstance.t('失败重试次数', '失败重试次数')}
      >
        <InputNumber min={0} />
      </Form.Item>
      
      <Form.Item 
        name="restartPolicy" 
        label={i18nInstance.t('重启策略', '重启策略')}
      >
        <Radio.Group>
          <Radio value="Never">从不重启 (Never)</Radio>
          <Radio value="OnFailure">仅失败时 (OnFailure)</Radio>
        </Radio.Group>
      </Form.Item>
    </Space>
  );

  return (
    <BaseForm
      onOk={onOk}
      onCancel={onCancel}
      templateType="Cronjob"
      defaultValues={defaultValues}
      generateYaml={generateYaml}
      cronScheduleStep={CronScheduleStep}
      jobInfoStep={JobInfoStep}
    >
      {/* 高级设置部分为空，定时和任务信息已通过指定步骤传递 */}
    </BaseForm>
  );
};

export default CronjobForm;