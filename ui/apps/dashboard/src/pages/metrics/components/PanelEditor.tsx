/**
 * Copyright 2024 The Karmada Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Typography } from 'antd';
import type { MetricCatalogItem } from '@/services/metrics';
import type { PanelConfig, ChartType } from '../dashboard-config';
import { generatePanelId } from '../dashboard-config';

const { Text } = Typography;

interface PanelEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (panels: PanelConfig[]) => void;
  catalog: MetricCatalogItem[];
  editingPanel?: PanelConfig | null;
  existingMetricNames?: string[];
}

const buildTitle = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const chartTypeOptions = [
  { value: 'line', label: '📈 Line Chart' },
  { value: 'area', label: '📊 Area Chart' },
  { value: 'bar', label: '📉 Bar Chart' },
  { value: 'gauge', label: '🎯 Gauge' },
];

export default function PanelEditor({
  open,
  onClose,
  onSave,
  catalog,
  editingPanel,
  existingMetricNames = [],
}: PanelEditorProps) {
  const [form] = Form.useForm();
  const [selectedMetric, setSelectedMetric] = useState<MetricCatalogItem | null>(null);

  const isEditing = Boolean(editingPanel);
  const existingSet = new Set(existingMetricNames);

  useEffect(() => {
    if (open) {
      if (editingPanel) {
        form.setFieldsValue({
          metricName: editingPanel.metricName,
          chartType: editingPanel.chartType,
          title: editingPanel.title,
        });
        const found = catalog.find((m) => m.name === editingPanel.metricName);
        setSelectedMetric(found ?? null);
      } else {
        form.resetFields();
        setSelectedMetric(null);
      }
    }
  }, [open, editingPanel, form, catalog]);

  const handleMetricChange = (metricName: string) => {
    const item = catalog.find((m) => m.name === metricName);
    setSelectedMetric(item ?? null);
    if (item) {
      form.setFieldsValue({
        chartType: item.suggestedChart,
        title: buildTitle(item.name),
      });
    }
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (isEditing) {
        const panel: PanelConfig = {
          id: editingPanel?.id ?? generatePanelId(),
          metricName: values.metricName,
          chartType: values.chartType as ChartType,
          title: values.title,
          visible: true,
        };
        onSave([panel]);
        onClose();
        return;
      }

      const metricNames: string[] = values.metricNames ?? [];
      const panels: PanelConfig[] = metricNames.map((name) => {
        const item = catalog.find((m) => m.name === name);
        return {
          id: generatePanelId(),
          metricName: name,
          chartType: (item?.suggestedChart ?? 'line') as ChartType,
          title: buildTitle(name),
          visible: true,
        };
      });
      onSave(panels);
      onClose();
    });
  };

  return (
    <Modal
      title={isEditing ? 'Edit Panel' : 'Add Panel'}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText={isEditing ? 'Update' : 'Add'}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {isEditing ? (
          <>
            <Form.Item
              name="metricName"
              label="Metric"
              rules={[{ required: true, message: 'Please select a metric' }]}
            >
              <Select
                showSearch
                placeholder="Search and select a metric..."
                optionFilterProp="label"
                onChange={handleMetricChange}
                options={catalog.map((m) => ({
                  value: m.name,
                  label: m.name,
                }))}
              />
            </Form.Item>

            {selectedMetric && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedMetric.help || 'No description available'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Type: <strong>{selectedMetric.prometheusType}</strong> | Group:{' '}
                  <strong>{selectedMetric.group}</strong>
                </Text>
              </div>
            )}

            <Form.Item
              name="chartType"
              label="Chart Type"
              rules={[{ required: true, message: 'Please select a chart type' }]}
            >
              <Select options={chartTypeOptions} />
            </Form.Item>

            <Form.Item
              name="title"
              label="Panel Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
            >
              <Input placeholder="Enter panel title" />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name="metricNames"
            label="Metric"
            rules={[{ required: true, message: 'Please select at least one metric' }]}
            extra="Already added metrics are disabled. You can select multiple metrics at once."
          >
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="Search and select metrics..."
              optionFilterProp="label"
              options={catalog.map((m) => ({
                value: m.name,
                label: m.name,
                disabled: existingSet.has(m.name),
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
