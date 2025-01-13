import { ITagListProps } from '.';
import { Labels } from '@/services/base.ts';
export function convertLabelToTags(
  prefix: string,
  labels: Labels = {},
): ITagListProps['tags'] {
  return Object.keys(labels).map((key) => {
    return {
      key: `${prefix}-${key}`,
      value: `${key}:${labels[key]}`,
    };
  });
}
