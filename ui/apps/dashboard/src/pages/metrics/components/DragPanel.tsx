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

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/utils/cn';
import styles from './DragPanel.module.less';

interface DragPanelProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export default function DragPanel({ id, children, disabled }: DragPanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(styles.dragPanel, !disabled && styles.withHandle)}
      style={style}
      {...attributes}
    >
      {!disabled && (
        <div {...listeners} className={styles.dragHandle}>
          <GripVertical size={14} />
        </div>
      )}
      {children}
    </div>
  );
}
