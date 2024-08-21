import { useState, useEffect } from 'react';
import { Avatar, Row, Col, Typography, Tabs, Button, Modal, notification, List, Popconfirm, Dropdown } from 'antd';
import { ReloadOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, EditOutlined, EllipsisOutlined } from '@ant-design/icons';
import { KarmadaHeaderProps ,restartDeployment, checkDeploymentStatus, reinstallDeployment, GetPodYAML } from '@/services/karmada-config';
import ComponentEditorDrawer from './component-editor-drawer';

const { Title, Text } = Typography;

const KarmadaHeader: React.FC<KarmadaHeaderProps> = ({ onTabChange, appName, podNames }) => {
  const [modalStates, setModalStates] = useState({
    isModalVisible: false,
    loading: false,
    isPodListVisible: false,
    isYamlModalVisible: false,
    selectedPod: '',
    editorMode: 'detail' as 'edit' | 'detail',
    yamlContent: '',
  });

  const [pods, setPods] = useState<string[]>(podNames);

  useEffect(() => {
    setPods(podNames);
  }, [podNames]);

  const showRestartModal = () => setModalStates(prev => ({ ...prev, isModalVisible: true }));

  const handleRestartDeployment = async () => {
    setModalStates(prev => ({ ...prev, loading: true }));
    try {
      const response = await restartDeployment(appName);
      notification.success({ 
        message: 'Success', description: response.status
       });
    } catch {
      notification.error({ 
        message: 'Error', description: 'Failed to restart deployment' });
    } finally {
      setModalStates(prev => ({ ...prev, loading: false, isModalVisible: false }));
    }
  };

  const handleCheckStatus = async () => {
    try {
      const response = await checkDeploymentStatus(appName);
      if (response.status.toLowerCase().includes('error')) throw new Error(response.status);
      notification.info({ 
        message: 'Deployment Status', description: response.status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.error({ message: 'Error', description: errorMessage });
    }
  };

  const handleReinstall = () => setModalStates(prev => ({ ...prev, isPodListVisible: true }));

  const handlePodDelete = async (podName: string) => {
    setModalStates(prev => ({ ...prev, loading: true }));
    try {
      await reinstallDeployment(podName);
      notification.success({
         message: 'Success', description: `Pod ${podName} reinstalled successfully.` });
      setPods(pods.filter(pod => pod !== podName));
    } catch {
      notification.error({ 
        message: 'Error', description: `Failed to reinstall pod ${podName}.` 
      });
    } finally {
      setModalStates(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteAll = async () => {
    setModalStates(prev => ({ ...prev, loading: true }));
    try {
      for (const pod of pods) {
        await reinstallDeployment(pod);
      }
      notification.success({ message: 'Success', description: 'All pods reinstalled successfully.' });
      setPods([]);
    } catch {
      notification.error({ message: 'Error', description: 'Failed to reinstall all pods.' });
    } finally {
      setModalStates(prev => ({ ...prev, loading: false }));
    }
  };

  const handlePodAction = async (podName: string, mode: 'edit' | 'detail') => {
    setModalStates(prev => ({ ...prev, selectedPod: podName, editorMode: mode }));
    try {
      const response = await GetPodYAML(podName);
      setModalStates(prev => ({ ...prev, yamlContent: response, isYamlModalVisible: true }));
    } catch {
      notification.error({ message: 'Error', description: 'Failed to fetch pod YAML' });
    }
  };

  const menuItems = [
    {
      key: 'checkStatus',
      label: (
        <a onClick={handleCheckStatus} style={{ cursor: 'pointer' }}>Check Status</a>
      ),
    },
    {
      key: 'reinstall',
      label: (
        <a onClick={handleReinstall} style={{ cursor: 'pointer' }}>Reinstall</a>
      ),
    },
  ];

  return (
    <Row gutter={16} align="middle" style={{ backgroundColor: '#f5f5f5', padding: '2px', borderRadius: '8px' }}>
      <Col>
      <Avatar style={{backgroundColor: '#00008B'}} size="large">KA</Avatar>
      </Col>
      <Col>
        <Title level={4}>{appName}</Title>
        <Text type="secondary">{`${appName} needs description..`}</Text>
      </Col>
      <Col flex="auto" />
      <Button icon={<ReloadOutlined />} onClick={showRestartModal}></Button>
      <Dropdown menu={{ items: menuItems }}>
        <Button>
          <EllipsisOutlined />
        </Button>
      </Dropdown>
      <Button icon={<FileTextOutlined />} onClick={() => setModalStates(prev => ({ ...prev, isYamlModalVisible: true }))}></Button>

      <Col span={24}>
        <Tabs defaultActiveKey="1" onChange={onTabChange} items={[
          { label: "Details", key: "1" },
          { label: "Logs", key: "2" }
        ]} />
      </Col>

      <Popconfirm
        title="Do you want to restart the deployment?"
        open={modalStates.isModalVisible}
        onConfirm={handleRestartDeployment}
        onCancel={() => setModalStates(prev => ({ ...prev, isModalVisible: false }))}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ loading: modalStates.loading }}
        cancelButtonProps={{ loading: modalStates.loading }}
      />

      <Modal
        title="Select Pods to Reinstall"
        open={modalStates.isPodListVisible}
        onOk={handleDeleteAll}
        onCancel={() => setModalStates(prev => ({ ...prev, isPodListVisible: false }))}
        okText="Reinstall All"
        cancelText="Cancel"
        confirmLoading={modalStates.loading}
      >
        <List
          bordered
          dataSource={pods}
          renderItem={pod => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Are you sure you want to delete this pod?"
                  onConfirm={() => handlePodDelete(pod)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button icon={<DeleteOutlined />} type="link">Delete</Button>
                </Popconfirm>
              ]}
            >
              {pod}
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="View/Edit YAML"
        open={modalStates.isYamlModalVisible}
        onCancel={() => setModalStates(prev => ({ ...prev, isYamlModalVisible: false }))}
        footer={null}
        width={500}
      >
        <List
          bordered
          dataSource={pods}
          renderItem={pod => (
            <List.Item
              actions={[
                <Button icon={<EyeOutlined />} type="link" onClick={() => handlePodAction(pod, 'detail')}>View</Button>,
                <Button icon={<EditOutlined />} type="link" onClick={() => handlePodAction(pod, 'edit')}>Edit</Button>
              ]}
            >
              {pod}
            </List.Item>
          )}
        />
        {modalStates.selectedPod && (
          <ComponentEditorDrawer
            initialOpen={true}
            mode={modalStates.editorMode}
            podName={modalStates.selectedPod}
            namespace="karmada-system"
            onClose={() => {
              setModalStates(prev => ({ ...prev, isYamlModalVisible: false, selectedPod: '' }));
            }}
            yamlContent={modalStates.yamlContent}
          />
        )}
      </Modal>
    </Row>
  );
};

export default KarmadaHeader;