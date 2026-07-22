/*
Copyright 2026 The Karmada Authors.

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

import { Empty, Table as AntdTable } from 'antd';
import type { TableProps } from 'antd';
import type { AnyObject } from 'antd/es/_util/type';
import type { KeyboardEvent } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type TableColumn<RecordType extends AnyObject> = NonNullable<
  TableProps<RecordType>['columns']
>[number];

const MIN_COLUMN_WIDTH = 116;
const MAX_INFERRED_WIDTH = 360;

function getTitleText(title: TableColumn<AnyObject>['title']): string {
  if (typeof title === 'string' || typeof title === 'number') {
    return String(title);
  }
  return '';
}

function getColumnKey(column: TableColumn<AnyObject>): string {
  const dataIndex = 'dataIndex' in column ? column.dataIndex : undefined;
  const rawKey = column.key ?? dataIndex;
  if (Array.isArray(rawKey)) {
    return rawKey.join('.');
  }
  return rawKey ? String(rawKey) : '';
}

function getDisplayLength(text: string) {
  return Array.from(text).reduce((total, char) => {
    return total + (char.charCodeAt(0) > 255 ? 2 : 1);
  }, 0);
}

function inferColumnWidth(column: TableColumn<AnyObject>) {
  if ('width' in column && column.width) {
    return undefined;
  }

  const key = getColumnKey(column).toLowerCase();
  const title = getTitleText(column.title);
  const titleWidth = getDisplayLength(title) * 8 + 48;
  let semanticWidth = MIN_COLUMN_WIDTH;

  if (/^(op|action|actions)$/.test(key) || /操作|actions?/i.test(title)) {
    semanticWidth = 168;
  } else if (/name|namespace|cluster|workload|service|config|secret|role/.test(key)) {
    semanticWidth = 180;
  } else if (/label|annotation|image|message|subject|selector|rule|resource|host|address/.test(key)) {
    semanticWidth = 260;
  } else if (/time|date|age|creation/.test(key) || /时间|age/i.test(title)) {
    semanticWidth = 172;
  } else if (/status|ready|phase|mode|type|kind/.test(key) || /状态|模式|类型/.test(title)) {
    semanticWidth = 132;
  }

  return Math.min(
    MAX_INFERRED_WIDTH,
    Math.max(MIN_COLUMN_WIDTH, semanticWidth, titleWidth),
  );
}

function getColumnKind(column: TableColumn<AnyObject>) {
  const key = getColumnKey(column).toLowerCase();
  const title = getTitleText(column.title);

  if (/^(op|action|actions)$/.test(key) || /操作|actions?/i.test(title)) {
    return 'action';
  }
  if (/name|namespace|cluster|workload|service|config|secret|role/.test(key)) {
    return 'identity';
  }
  if (/status|ready|phase/.test(key) || /状态|ready|phase/i.test(title)) {
    return 'status';
  }
  if (/time|date|age|creation/.test(key) || /时间|age/i.test(title)) {
    return 'time';
  }
  return 'default';
}

function getPrimitiveCellTitle(value: unknown): string | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return undefined;
}

function getDataByIndex(record: AnyObject, dataIndex: unknown) {
  if (!dataIndex) return undefined;
  const path = Array.isArray(dataIndex) ? dataIndex : String(dataIndex).split('.');
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[String(key)];
  }, record);
}

function enhanceColumns<RecordType extends AnyObject>(
  columns?: TableProps<RecordType>['columns'],
): TableProps<RecordType>['columns'] {
  if (!columns) return columns;

  return columns.map((column) => {
    const children =
      'children' in column && column.children
        ? enhanceColumns(column.children as TableProps<RecordType>['columns'])
        : undefined;
    const dataIndex = 'dataIndex' in column ? column.dataIndex : undefined;
    const inferredMinWidth = inferColumnWidth(column as TableColumn<AnyObject>);
    const kind = getColumnKind(column as TableColumn<AnyObject>);
    const className = cn(
      'karmada-table-column',
      `karmada-table-column-${kind}`,
      column.className,
    );

    return {
      ...column,
      ...(children ? { children } : {}),
      className,
      ellipsis:
        column.ellipsis === undefined && kind !== 'action'
          ? { showTitle: false }
          : column.ellipsis,
      minWidth:
        'minWidth' in column && column.minWidth !== undefined
          ? column.minWidth
          : inferredMinWidth,
      fixed:
        kind === 'action' && column.fixed === undefined ? 'right' : column.fixed,
      width:
        kind === 'action' && !('width' in column && column.width)
          ? 168
          : column.width,
      onCell: (record: RecordType, rowIndex?: number) => {
        const cellProps = column.onCell?.(record, rowIndex) ?? {};
        const title = getPrimitiveCellTitle(
          getDataByIndex(record as AnyObject, dataIndex),
        );
        return title && !cellProps.title
          ? {
              ...cellProps,
              title,
            }
          : cellProps;
      },
    } as TableColumn<RecordType>;
  });
}

function emptyText(): ReactNode {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}

export default function DataTable<RecordType extends AnyObject = AnyObject>(
  props: TableProps<RecordType>,
) {
  const {
    className,
    columns,
    locale,
    onRow,
    pagination,
    rowClassName,
    scroll,
    showSorterTooltip,
    size,
    sticky,
    tableLayout,
    ...restProps
  } = props;

  return (
    <AntdTable<RecordType>
      className={cn('karmada-data-table', className)}
      columns={enhanceColumns(columns)}
      locale={{
        emptyText: emptyText(),
        ...locale,
      }}
      pagination={
        pagination === false
          ? false
          : {
              showSizeChanger: true,
              showQuickJumper: true,
              position: ['bottomRight'],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
              ...pagination,
            }
      }
      onRow={(record, index) => {
        const rowProps = onRow?.(record, index) ?? {};
        const rowClickHandler = rowProps.onClick;
        return {
          ...rowProps,
          className: cn('karmada-data-table-row', rowProps.className),
          tabIndex: rowClickHandler ? (rowProps.tabIndex ?? 0) : rowProps.tabIndex,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            rowProps.onKeyDown?.(event);
            if (
              rowClickHandler &&
              !event.defaultPrevented &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault();
              (rowClickHandler as unknown as (event: KeyboardEvent<HTMLElement>) => void)(
                event,
              );
            }
          },
        };
      }}
      rowClassName={(record, index, indent) =>
        cn(
          typeof rowClassName === 'function'
            ? rowClassName(record, index, indent)
            : rowClassName,
        )
      }
      scroll={{
        x: 'max-content',
        scrollToFirstRowOnChange: true,
        ...scroll,
      }}
      showSorterTooltip={showSorterTooltip ?? { target: 'sorter-icon' }}
      size={size ?? 'middle'}
      sticky={sticky ?? true}
      tableLayout={tableLayout ?? 'auto'}
      {...restProps}
    />
  );
}
