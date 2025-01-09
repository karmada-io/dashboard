import { FC } from 'react';
import { Dropdown, Tag } from 'antd';
import { cn } from '@/utils/cn.ts';

export interface ITagListProps {
  tags: {
    key: string;
    value: string;
  }[];
  maxLen?: number;
}

const TagList: FC<ITagListProps> = (props) => {
  const { tags = [], maxLen = Infinity } = props;
  return (
    <>
      {tags.length === 0 ? (
        '-'
      ) : tags.length <= maxLen ? (
        <div className="flex flex-row flex-wrap gap-y-[4px]">
          {tags.map((t) => (
            <Tag key={t.key}>{t.value}</Tag>
          ))}
        </div>
      ) : (
        <div
          className={cn('flex', 'flex-row', {
            'flex-no-wrap': tags.length > maxLen,
          })}
        >
          {tags.slice(0, maxLen).map((t) => (
            <Tag key={t.key}>{t.value}</Tag>
          ))}
          <Dropdown
            menu={{
              items: tags.slice(maxLen).map((t) => ({
                key: t.key,
                label: <Tag>{t.value}</Tag>,
              })),
            }}
          >
            <Tag>+1</Tag>
          </Dropdown>
        </div>
      )}
    </>
  );
};
export { convertLabelToTags } from './helper.ts';
export default TagList;
