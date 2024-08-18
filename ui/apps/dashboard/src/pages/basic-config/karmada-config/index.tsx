import { useEffect, useState } from 'react';
import { Layout, Menu, Row, Col, Card } from 'antd';
import { GetRunningPods, GetPodDetails, GetPodLogs } from '@/services/config';
import KarmadaHeader from './header';
import TerminalLogs from './TerminalLogs';
import dayjs from 'dayjs';
import Panel from '@/components/panel'; 

const { Sider, Content } = Layout;

const Label = ({ text }: { text: string }) => <strong>{text}:</strong>;

const Children = ({ content }: { content: string }) => <p>{content}</p>;

const KarmadaConfigPage = () => {
  const [pods, setPods] = useState<string[]>([]);
  const [selectedPodDetails, setSelectedPodDetails] = useState<any | null>(null);
  const [podLogs, setPodLogs] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState('1');
  const [podCount, setPodCount] = useState<number>(0);
  const [podNames, setPodNames] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await GetRunningPods();
        setPods(data.appLabels);
        if (data.appLabels.length > 0) {
          handlePodClick(data.appLabels[0]);
        }
      } catch (error) {
        console.error('Error fetching running pods:', error);
      }
    }

    fetchData();
  }, []);

  const handlePodClick = async (podName: string) => {
    try {
      const data = await GetPodDetails(podName);
      setSelectedPodDetails(data.pods[0]);
      setPodCount(data.pods.length);
      setPodNames(data.pods.map(pod => pod.name));
      const logsPromises = data.pods.map(async (pod: { name: string }) => {
        const logData = await GetPodLogs(pod.name);
        return { name: pod.name, log: logData.logs };
      });

      const logsArray = await Promise.all(logsPromises);
      const logs = logsArray.reduce((acc, { name, log }) => {
        acc[name] = log;
        return acc;
      }, {} as { [key: string]: string });

      setPodLogs(logs);
    } catch (error) {
      console.error(`Error fetching details for pod ${podName}:`, error);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const metadataItems = (
    <Card title="Metadata" style={{ marginBottom: '16px' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Label text="UID" />
          <Children content={selectedPodDetails?.uid || '-'} />
        </Col>
        <Col span={12}>
          <Label text="Creation Timestamp" />
          <Children
            content={
              selectedPodDetails?.creationTimestamp
                ? dayjs(selectedPodDetails.creationTimestamp).format('YYYY-MM-DD HH:mm:ss')
                : '-'
            }
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Label text="Generate Name" />
          <Children content={selectedPodDetails?.generateName || '-'} />
        </Col>
        <Col span={12}>
          <Label text="Labels" />
          <Children content={`app: ${selectedPodDetails?.labels?.app || '-'}`} />
        </Col>
      </Row>
    </Card>
  );

  const podStatusItems = (
    <Card title="Pod Status" style={{ marginBottom: '16px' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Label text="Updated" />
          <Children content={podCount.toString()} />
        </Col>
        <Col span={8}>
          <Label text="Total" />
          <Children content={podCount.toString()} />
        </Col>
        <Col span={8}>
          <Label text="Available" />
          <Children content={podCount.toString()} />
        </Col>
      </Row>
    </Card>
  );

  return (
    <Panel>
      <Layout>
      <Sider width={200} style={{ background: '#fff' }}>
        <Menu
            mode="inline"
            defaultSelectedKeys={['0']}
            style={{
              padding: '10px',
              width: '240px',
              height: '100%',
              maxHeight: '550px',
              overflowY: 'auto',
              borderRight: 0,
            }}
          >
            {pods.map((pod, index) => (
              <Menu.Item key={index} onClick={() => handlePodClick(pod)}>
                {pod}
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
            }}
          >
            <KarmadaHeader
              onTabChange={handleTabChange}
              appName={selectedPodDetails?.labels?.app || 'Loading App Name ...'}
              podNames={podNames}
            />
            {activeTab === '1' && selectedPodDetails && (
              <>
                {metadataItems}
                {podStatusItems}
              </>
            )}
            {activeTab === '2' && <TerminalLogs logs={podLogs} />}
          </Content>
        </Layout>
      </Layout>
    </Panel>
  );
};

export default KarmadaConfigPage;
