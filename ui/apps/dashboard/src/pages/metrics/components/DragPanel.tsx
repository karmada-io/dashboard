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
