import { useWindowSize } from '@uidotdev/usehooks';

const useTagNum = (
  params: {
    targetWidth?: number;
    defaultTagNum?: number;
  } = {},
) => {
  const { targetWidth = 1800, defaultTagNum = 1 } = params;
  const size = useWindowSize();
  if (!size || !size.width)
    return {
      tagNum: undefined,
    };
  const tagNum = size.width > targetWidth ? undefined : defaultTagNum;
  return {
    tagNum,
  };
};

export default useTagNum;
