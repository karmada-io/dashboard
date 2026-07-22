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

import { Button, Popconfirm, Space, Tooltip } from 'antd';
import {
  Check,
  Compass,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';

import styles from './DashboardToolbar.module.less';

interface DashboardToolbarProps {
  editMode: boolean;
  hasCustomConfig: boolean;
  onToggleEdit: () => void;
  onAddPanel: () => void;
  onReset: () => void;
  onExplore?: () => void;
  onCopy?: () => void;
  exporting?: boolean;
}

export default function DashboardToolbar({
  editMode,
  hasCustomConfig,
  onToggleEdit,
  onAddPanel,
  onReset,
  onExplore,
  onCopy,
  exporting,
}: DashboardToolbarProps) {
  return (
    <Space size="small" className={styles.toolbar} wrap>
      <Tooltip title="Explore metrics with DSL query">
        <Button
          size="middle"
          className={styles.secondaryButton}
          icon={<Compass size={16} />}
          onClick={onExplore}
        />
      </Tooltip>
      {editMode && (
        <>
          <Tooltip title="Add panel">
            <Button
              type="primary"
              size="middle"
              className={styles.primaryButton}
              icon={<Plus size={16} />}
              onClick={onAddPanel}
            />
          </Tooltip>
          {hasCustomConfig && (
            <Popconfirm
              title="Reset to default?"
              description="This will remove all customizations and show all metrics."
              onConfirm={onReset}
              okText="Reset"
              cancelText="Cancel"
            >
              <Tooltip title="Reset to default">
                <Button
                  size="middle"
                  className={styles.dangerButton}
                  icon={<RotateCcw size={16} />}
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </>
      )}
      {onCopy && (
        <Tooltip title="Copy current component metrics JSON">
          <Button
            size="middle"
            className={styles.secondaryButton}
            icon={<Copy size={16} />}
            loading={exporting}
            onClick={onCopy}
          />
        </Tooltip>
      )}
      <Tooltip title={editMode ? 'Done editing' : 'Customize dashboard'}>
        <Button
          size="middle"
          className={editMode ? styles.primaryButton : styles.secondaryButton}
          type={editMode ? 'primary' : 'default'}
          icon={editMode ? <Check size={16} /> : <Pencil size={16} />}
          onClick={onToggleEdit}
        />
      </Tooltip>
    </Space>
  );
}
