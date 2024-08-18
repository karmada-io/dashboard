import { useState, useEffect } from 'react';
import { Menu, Avatar, Row, Col, Typography, Tabs, Button, Modal, notification, List, Popconfirm, Dropdown } from 'antd';
import { ReloadOutlined, DeleteOutlined, FileTextOutlined, EyeOutlined, EditOutlined, EllipsisOutlined } from '@ant-design/icons';
import { KarmadaHeaderProps ,restartDeployment, checkDeploymentStatus, reinstallDeployment, GetPodYAML } from '@/services/config';
import ComponentEditorDrawer from './component-editor-drawer';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const KarmadaHeader: React.FC<KarmadaHeaderProps> = ({ onTabChange, appName, podNames }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pods, setPods] = useState<string[]>(podNames);
  const [isPodListVisible, setIsPodListVisible] = useState(false);
  const [isYamlModalVisible, setIsYamlModalVisible] = useState(false);
  const [selectedPod, setSelectedPod] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'detail'>('detail');
  const [yamlContent, setYamlContent] = useState('');

  useEffect(() => {
    setPods(podNames);
  }, [podNames]);

  const showRestartModal = () => setIsModalVisible(true);

  const handleRestartDeployment = async () => {
    setLoading(true);
    try {
      const response = await restartDeployment(appName);
      notification.success({ 
        message: 'Success', description: response.status
       });
    } catch {
      notification.error({ 
        message: 'Error', description: 'Failed to restart deployment' });
    } finally {
      setLoading(false);
      setIsModalVisible(false);
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
      notification.error({ message: 'Error', description: errorMessage 

      });
    }
  };

  const handleReinstall = () => setIsPodListVisible(true);

  const handlePodDelete = async (podName: string) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      for (const pod of pods) {
        await reinstallDeployment(pod);
      }
      notification.success({ message: 'Success', description: 'All pods reinstalled successfully.' 
      });
      setPods([]);
    } catch {
      notification.error({ message: 'Error', description: 'Failed to reinstall all pods.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePodAction = async (podName: string, mode: 'edit' | 'detail') => {
    setSelectedPod(podName);
    setEditorMode(mode);
    try {
      const response = await GetPodYAML(podName);
      setYamlContent(response);
      setIsYamlModalVisible(true);
    } catch {
      notification.error({ message: 'Error', description: 'Failed to fetch pod YAML' });
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="checkStatus">
        <a onClick={handleCheckStatus} style={{ cursor: 'pointer' }}>Check Status</a>
      </Menu.Item>
      <Menu.Item key="reinstall">
        <a onClick={handleReinstall} style={{ cursor: 'pointer' }}>Reinstall</a>
      </Menu.Item>
    </Menu>
  );

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
      <Dropdown overlay={menu}>
        <Button>
          <EllipsisOutlined />
        </Button>
      </Dropdown>
      <Button icon={<FileTextOutlined />} onClick={() => setIsYamlModalVisible(true)}></Button>

      <Col span={24}>
        <Tabs defaultActiveKey="1" onChange={onTabChange}>
          <TabPane tab="Details" key="1" />
          <TabPane tab="Logs" key="2" />
        </Tabs>
      </Col>

      <Popconfirm
        title="Do you want to restart the deployment?"
        visible={isModalVisible}
        onConfirm={handleRestartDeployment}
        onCancel={() => setIsModalVisible(false)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ loading }}
        cancelButtonProps={{ loading }}
      />

      <Modal
        title="Select Pods to Reinstall"
        visible={isPodListVisible}
        onOk={handleDeleteAll}
        onCancel={() => setIsPodListVisible(false)}
        okText="Reinstall All"
        cancelText="Cancel"
        confirmLoading={loading}
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
        visible={isYamlModalVisible}
        onCancel={() => setIsYamlModalVisible(false)}
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
        {selectedPod && (
          <ComponentEditorDrawer
            initialOpen={true}
            mode={editorMode}
            podName={selectedPod}
            namespace="karmada-system"
            onClose={() => {
              setIsYamlModalVisible(false);
              setSelectedPod('');
            }}
            yamlContent={yamlContent}
          />
        )}
      </Modal>
    </Row>
  );
};

export default KarmadaHeader;
