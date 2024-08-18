import { useState, useEffect } from 'react';
import { FC } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Drawer, Space, notification } from 'antd';
import i18nInstance from '@/utils/i18n';
import { ComponentEditorDrawerProps, UpdatePodYAML, GetPodYAML } from '@/services/config';

function getTitle(
  mode: ComponentEditorDrawerProps['mode'],
  podName: string = '',
) {
  switch (mode) {
    case 'edit':
      return `Edit ${podName} Configuration`;
    case 'detail':
      return `${podName} Configuration Details`;
    default:
      return '';
  }
}

const ComponentEditorDrawer: FC<ComponentEditorDrawerProps> = (props) => {
  const { initialOpen, mode, podName, onClose, yamlContent } = props;
  const [content, setContent] = useState<string>(yamlContent);
  const [isOpen, setIsOpen] = useState(initialOpen);

  useEffect(() => {
    setIsOpen(initialOpen);
  }, [initialOpen]);

  useEffect(() => {
    setContent(yamlContent);
  }, [yamlContent]);
  
  useEffect(() => {
    const fetchYAML = async () => {
      try {
        const yamlContent = await GetPodYAML(podName);
        setContent(yamlContent);
      } catch (error) {
        notification.error({
          message: 'Error',
          description: 'Failed to fetch pod YAML',
        });
      }
    };

    if (isOpen && podName) {
      fetchYAML();
    }
  }, [isOpen, podName]);

  function handleEditorChange(value: string | undefined) {
    setContent(value || '');
  }

  const handleUpdate = async () => {
    try {
      const updateRet = await UpdatePodYAML(podName, { yamlContent: content });
      console.log(updateRet);

      if (updateRet.code === 200) {
        notification.success({
          message: 'Update Successful',
          description: updateRet.message,
        });
        handleClose();
      } else {
        throw new Error(updateRet.message);
      }
    } catch (error) {
      notification.error({
        message: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <Drawer
      open={isOpen}
      title={getTitle(mode, podName)}
      width={800}
      onClose={handleClose}
      footer={
        <div className={'flex flex-row justify-end'}>
          <Space>
            <Button onClick={handleClose}>
              {i18nInstance.t('625fb26b4b3340f7872b411f401e754c')}
            </Button>
            {mode === 'edit' && (
              <Button type="primary" onClick={handleUpdate}>
                {i18nInstance.t('38cf16f2204ffab8a6e0187070558721')}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Editor
        defaultLanguage="yaml"
        value={content}
        theme="vs-dark"
        options={{
          lineNumbers: 'on',
          readOnly: mode === 'detail',
          minimap: { enabled: false },
        }}
        onChange={handleEditorChange}
      />
    </Drawer>
  );
}

export default ComponentEditorDrawer;