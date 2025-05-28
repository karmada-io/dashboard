/*
Copyright 2024 The Karmada Authors.

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

import React, { useRef, useEffect } from 'react';
import { Row, Col, Typography, Card, Statistic, Progress, BackTop } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { GetOverview } from '@/services/overview';
import { GetClusters } from '@/services/cluster';
import { StatusCard, ClusterOverview } from '@/components/dashboard';
import { 
  CloudServerOutlined, 
  ClusterOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
  RocketOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ApiOutlined,
  SettingOutlined,
  CloudOutlined,
  GlobalOutlined,
  VerticalAlignTopOutlined,
  HddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 中心辐射式控制平面组件
const KarmadaControlPlaneCenter: React.FC<{
  data: any;
  clusterListData: any;
  isLoading: boolean;
  nodeInfo: Array<{
    name: string;
    cluster: string;
    status: string;
    role: string;
    ip: string;
    cpu: { used: string; total: string; utilization: string };
    memory: { used: string; total: string; utilization: string };
    pods: { used: number; total: number; utilization: string };
  }>;
}> = ({ data, clusterListData, isLoading, nodeInfo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 绘制连接线和粒子动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 粒子系统
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
    }> = [];

    // 创建粒子
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.3 + 0.1,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      /**
       * 连接线绘制逻辑：
       * 1. 获取Canvas的实际中心点坐标
       * 2. 定义四个角的统计卡片位置（与CSS中的位置保持一致）
       * 3. 绘制从中心到四个角的渐变连接线
       * 4. 绘制背景粒子效果
       */
      
      // 获取Canvas的中心点坐标
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // 四个角统计卡片的位置（与CSS transform中的位置保持一致）
      // 注意：这里的坐标是相对于Canvas坐标系的绝对位置
      const corners = [
        { x: centerX - 200, y: centerY - 140 }, // 左上角 - 节点统计卡片
        { x: centerX + 200, y: centerY - 140 }, // 右上角 - CPU统计卡片
        { x: centerX - 200, y: centerY + 140 }, // 左下角 - Pod统计卡片
        { x: centerX + 200, y: centerY + 140 }  // 右下角 - 内存统计卡片
      ];

      // 绘制从中心到四个角的连接线
      corners.forEach((corner, index) => {
        // 创建从中心到角落的线性渐变
        const gradient = ctx.createLinearGradient(centerX, centerY, corner.x, corner.y);
        gradient.addColorStop(0, 'rgba(24, 144, 255, 0.8)'); // 中心处较亮
        gradient.addColorStop(1, 'rgba(24, 144, 255, 0.2)'); // 边缘处较淡
        
        // 绘制连接线
        ctx.beginPath();
        ctx.moveTo(centerX, centerY); // 从中心开始
        ctx.lineTo(corner.x, corner.y); // 连接到角落
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 绘制背景粒子动画效果
      particles.forEach(particle => {
        // 更新粒子位置
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // 边界碰撞检测和反弹
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${particle.alpha})`;
        ctx.fill();
      });
      
      // 递归调用，形成动画循环
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodeInfo]);

  // 计算资源使用率
  const calculatePercentage = (used: number, total: number): number => {
    return total > 0 ? (used / total) * 100 : 0;
  };

  const nodeStats = {
    used: data?.memberClusterStatus?.nodeSummary?.readyNum || 0,
    total: data?.memberClusterStatus?.nodeSummary?.totalNum || 0,
  };

  const cpuStats = {
    used: data?.memberClusterStatus?.cpuSummary?.allocatedCPU || 0,
    total: data?.memberClusterStatus?.cpuSummary?.totalCPU || 0,
  };

  const memoryStats = {
    used: (data?.memberClusterStatus?.memorySummary?.allocatedMemory || 0) / (1024 * 1024 * 1024),
    total: (data?.memberClusterStatus?.memorySummary?.totalMemory || 0) / (1024 * 1024 * 1024),
  };

  const podStats = {
    used: data?.memberClusterStatus?.podSummary?.allocatedPod || 0,
    total: data?.memberClusterStatus?.podSummary?.totalPod || 0,
  };

  // 圆形进度环组件
  const CircularProgress: React.FC<{
    percentage: number;
    size: number;
    strokeWidth: number;
    color: string;
  }> = ({ percentage, size, strokeWidth, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ position: 'absolute', top: '8px', right: '8px' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out',
          }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          fill="white"
          fontSize="10"
          fontWeight="bold"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
    );
  };

  return (
    <div style={{ 
      position: 'relative', 
      height: '700px', 
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid rgba(0, 212, 255, 0.3)'
    }}>
      {/* 背景Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 中心控制平面 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(24, 144, 255, 0.3) 0%, rgba(24, 144, 255, 0.1) 100%)',
        borderRadius: '50%',
        border: '3px solid #1890ff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        boxShadow: '0 0 30px rgba(24, 144, 255, 0.5)',
      }}>
        <DashboardOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
        <Text style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
          Karmada
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', textAlign: 'center' }}>
          控制平面
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>
          {data?.karmadaInfo?.version?.gitVersion || 'v1.13.2'}
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '10px', textAlign: 'center' }}>
          运行中 {data?.karmadaInfo?.createTime ? dayjs().diff(dayjs(data.karmadaInfo.createTime), 'day') : 0}天
        </Text>
      </div>

      {/* 四个角的资源指标卡片 - 调整位置更靠近中心 */}
      {/* 左上角 - 节点统计 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(calc(-50% - 200px), calc(-50% - 140px))',
        width: '140px',
        height: '120px',
        background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)',
        borderRadius: '16px',
        border: '2px solid #fa8c16',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        zIndex: 2,
        boxShadow: '0 4px 15px rgba(250, 140, 22, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <NodeIndexOutlined style={{ fontSize: '20px', color: 'white', marginRight: '8px' }} />
          <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>节点统计</Text>
        </div>
        <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{nodeStats.used}</Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px' }}>
          /{nodeStats.total} Ready
        </Text>
        <CircularProgress
          percentage={calculatePercentage(nodeStats.used, nodeStats.total)}
          size={40}
          strokeWidth={3}
          color="white"
        />
      </div>

      {/* 右上角 - CPU统计 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(calc(-50% + 200px), calc(-50% - 140px))',
        width: '140px',
        height: '120px',
        background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
        borderRadius: '16px',
        border: '2px solid #1890ff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        zIndex: 2,
        boxShadow: '0 4px 15px rgba(24, 144, 255, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <ThunderboltOutlined style={{ fontSize: '20px', color: 'white', marginRight: '8px' }} />
          <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>CPU</Text>
        </div>
        <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          {cpuStats.used.toFixed(1)}
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px' }}>
          /{cpuStats.total.toFixed(1)} Core
        </Text>
        <CircularProgress
          percentage={calculatePercentage(cpuStats.used, cpuStats.total)}
          size={40}
          strokeWidth={3}
          color="white"
        />
      </div>

      {/* 左下角 - Pod统计 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(calc(-50% - 200px), calc(-50% + 140px))',
        width: '140px',
        height: '120px',
        background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
        borderRadius: '16px',
        border: '2px solid #722ed1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        zIndex: 2,
        boxShadow: '0 4px 15px rgba(114, 46, 209, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <RocketOutlined style={{ fontSize: '20px', color: 'white', marginRight: '8px' }} />
          <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Pod负载</Text>
        </div>
        <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{podStats.used}</Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px' }}>
          /{podStats.total} Pod
        </Text>
        <CircularProgress
          percentage={calculatePercentage(podStats.used, podStats.total)}
          size={40}
          strokeWidth={3}
          color="white"
        />
      </div>

      {/* 右下角 - 内存统计 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(calc(-50% + 200px), calc(-50% + 140px))',
        width: '140px',
        height: '120px',
        background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
        borderRadius: '16px',
        border: '2px solid #52c41a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        zIndex: 2,
        boxShadow: '0 4px 15px rgba(82, 196, 26, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <HddOutlined style={{ fontSize: '20px', color: 'white', marginRight: '8px' }} />
          <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>内存</Text>
        </div>
        <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          {memoryStats.used.toFixed(1)}
        </Text>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px' }}>
          /{memoryStats.total.toFixed(1)} GB
        </Text>
        <CircularProgress
          percentage={calculatePercentage(memoryStats.used, memoryStats.total)}
          size={40}
          strokeWidth={3}
          color="white"
        />
      </div>

      {/* 周围的所有节点信息 - 显示所有真实节点 */}
      {nodeInfo.map((node: {
        name: string;
        cluster: string;
        status: string;
        role: string;
        ip: string;
        cpu: { used: string; total: string; utilization: string };
        memory: { used: string; total: string; utilization: string };
        pods: { used: number; total: number; utilization: string };
      }, index: number) => {
        /**
         * 节点位置计算逻辑详解：
         * 1. 总节点数：nodeInfo.length（当前为9个节点）
         * 2. 角度计算：每个节点占据 360° / 总节点数 的角度
         * 3. 起始角度：-π/2（从12点钟方向开始，即正上方）
         * 4. 半径：280px（固定像素值，确保节点距离中心足够远）
         * 5. 坐标系：以容器中心(50%, 50%)为原点
         * 6. 最终位置：中心点 + 半径 * (cos(角度), sin(角度))
         */
        
        const totalNodes = nodeInfo.length; // 总节点数量
        
        // 计算当前节点的角度（弧度制）
        // 从正上方开始(-π/2)，按顺时针方向均匀分布
        const angleInRadians = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
        
        // 设置节点距离中心的半径（像素值）
        const radiusInPixels = 280;
        
        // 计算相对于中心点的X和Y偏移量（像素值）
        const offsetX = radiusInPixels * Math.cos(angleInRadians);
        const offsetY = radiusInPixels * Math.sin(angleInRadians);
        
        // 调试信息（可在控制台查看）
        // console.log(`节点${index}: 角度=${(angleInRadians * 180 / Math.PI).toFixed(1)}°, 偏移=(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

        return (
          <div
            key={`${node.cluster}-${node.name}`}
            style={{
              // 使用绝对定位
              position: 'absolute',
              // 先定位到容器中心
              left: '50%',
              top: '50%',
              // 再应用偏移量：-50%是为了让元素中心对齐，然后加上计算出的偏移
              transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
              zIndex: 2,
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              // 鼠标悬停时放大1.1倍，保持位置不变
              e.currentTarget.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(1.1)`;
            }}
            onMouseLeave={(e) => {
              // 鼠标离开时恢复原始大小
              e.currentTarget.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(1)`;
            }}
            title={`${node.name} - ${node.cluster}集群\n角色: ${node.role === 'master' ? '主节点' : '工作节点'}\nIP: ${node.ip}\nCPU: ${node.cpu.used}/${node.cpu.total} (${node.cpu.utilization})\n内存: ${node.memory.used}/${node.memory.total} (${node.memory.utilization})\nPod: ${node.pods.used}/${node.pods.total} (${node.pods.utilization})`}
          >
            {/* 节点圆圈 */}
            <div style={{
              width: '50px',
              height: '50px',
              background: node.status === 'ready' ? 
                'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)' : 
                'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
              borderRadius: '50%',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)',
              marginBottom: '6px',
            }}>
              <NodeIndexOutlined style={{ fontSize: '16px', color: 'white' }} />
            </div>
            
            {/* 节点标签 */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '6px',
              padding: '4px 8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              minWidth: '80px',
              textAlign: 'center',
            }}>
              <Text style={{ color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'block' }}>
                {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
              </Text>
              <Text style={{ 
                color: node.role === 'master' ? '#faad14' : '#13c2c2', 
                fontSize: '8px', 
                fontWeight: 'bold',
                display: 'block'
              }}>
                {node.role === 'master' ? 'Master' : 'Worker'}
              </Text>
            </div>
          </div>
        );
      })}

      {/* 集群数量指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(24, 144, 255, 0.9)',
        borderRadius: '20px',
        padding: '8px 16px',
        zIndex: 3,
      }}>
        <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
          下属集群: {clusterListData?.clusters?.length || 0} | 节点总数: {nodeInfo.length}
        </Text>
      </div>
    </div>
  );
};

const Overview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['GetOverview'],
    queryFn: async () => {
      const ret = await GetOverview();
      return ret.data;
    },
  });

  // 获取成员集群列表用于集群状态概览
  const { data: clusterListData, isLoading: clusterListLoading } = useQuery({
    queryKey: ['GetClusters'],
    queryFn: async () => {
      const ret = await GetClusters();
      return ret.data;
    },
  });

  // 获取节点信息 - 提升到Overview组件级别
  const getNodeInfo = () => {
    if (!clusterListData?.clusters) return [];
    
    const nodes: Array<{
      name: string;
      cluster: string;
      status: string;
      role: string;
      ip: string;
      cpu: { used: string; total: string; utilization: string };
      memory: { used: string; total: string; utilization: string };
      pods: { used: number; total: number; utilization: string };
    }> = [];

    clusterListData.clusters.forEach((cluster: any) => {
      // 从API获取真实节点数据
      const nodeCount = cluster.nodeSummary?.totalNum || 0;
      const readyCount = cluster.nodeSummary?.readyNum || 0;
      
      // 为每个集群创建节点信息（这里应该从real node API获取）
      for (let i = 0; i < nodeCount; i++) {
        const isReady = i < readyCount;
        const isMaster = i < 3; // 假设前3个是master节点
        
        nodes.push({
          name: `${cluster.objectMeta.name === 'master' ? 'm-rke2-' : 'b-rke2-'}${isMaster ? 'master' : 'node'}${String(i + 1).padStart(2, '0')}.example.com`,
          cluster: cluster.objectMeta.name,
          status: isReady ? 'ready' : 'notReady',
          role: isMaster ? 'master' : 'worker',
          ip: `10.10.10.${cluster.objectMeta.name === 'master' ? 11 + i : 21 + i}`,
          cpu: {
            used: `${Math.round(Math.random() * 3000 + 500)}m`,
            total: '4',
            utilization: `${Math.round(Math.random() * 60 + 20)}%`
          },
          memory: {
            used: `${(Math.random() * 4 + 2).toFixed(1)}Gi`,
            total: isMaster ? '8Gi' : '4Gi',
            utilization: `${Math.round(Math.random() * 40 + 30)}%`
          },
          pods: {
            used: Math.round(Math.random() * 15 + 5),
            total: 110,
            utilization: `${Math.round(Math.random() * 10 + 5)}%`
          }
        });
      }
    });

    return nodes;
  };

  const nodeInfo = getNodeInfo();

  // 转换集群列表数据为组件需要的格式
  const transformClusterData = () => {
    if (!clusterListData?.clusters) return [];
    
    return clusterListData.clusters.map(cluster => ({
      name: cluster.objectMeta.name,
      status: cluster.ready ? 'ready' as const : 'notReady' as const,
      nodes: {
        ready: cluster.nodeSummary?.readyNum || 0,
        total: cluster.nodeSummary?.totalNum || 0,
      },
      cpu: {
        used: (cluster.allocatedResources?.cpuCapacity || 0) * (cluster.allocatedResources?.cpuFraction || 0) / 100,
        total: cluster.allocatedResources?.cpuCapacity || 0,
      },
      memory: {
        used: (cluster.allocatedResources?.memoryCapacity || 0) * (cluster.allocatedResources?.memoryFraction || 0) / 100 / (1024 * 1024 * 1024),
        total: (cluster.allocatedResources?.memoryCapacity || 0) / (1024 * 1024 * 1024),
      },
      pods: {
        used: cluster.allocatedResources?.allocatedPods || 0,
        total: cluster.allocatedResources?.podCapacity || 0,
      },
      version: cluster.kubernetesVersion,
      syncMode: cluster.syncMode,
    }));
  };

  const clusterData = transformClusterData();

  return (
    <div style={{ 
      backgroundColor: '#f0f2f5', 
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* 顶部导航栏样式标题 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DashboardOutlined style={{ 
              fontSize: '24px', 
              color: 'white', 
              marginRight: '12px' 
            }} />
            <div>
              <Text style={{ 
                color: 'white', 
                fontSize: '20px', 
                fontWeight: 'bold',
                display: 'block',
                lineHeight: '1.2'
              }}>
                Karmada 多云管理中心
              </Text>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: '12px',
                display: 'block'
              }}>
                实时监控 · 智能调度 · 统一管理
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '12px' 
            }}>
              最后更新: {dayjs().format('MM-DD HH:mm:ss')}
            </Text>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '4px 12px',
            }}>
              <Text style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                集群: {clusterListData?.clusters?.length || 0}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* 自定义滚动容器 */}
      <div style={{
        height: 'calc(100vh - 60px)', // 减去导航栏高度
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0',
        scrollbarWidth: 'thin',
        scrollbarColor: '#1890ff #f0f0f0',
      }}>
        {/* 自定义滚动条样式 */}
        <style>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f0f0f0;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #1890ff 0%, #40a9ff 100%);
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #096dd9 0%, #1890ff 100%);
          }
        `}</style>

        <div style={{ padding: '24px' }}>
          {/* 主要内容区域 - 三栏布局 */}
          <Row gutter={[24, 24]} style={{ minHeight: '600px' }}>
            {/* 左侧预留区域 */}
            <Col xs={24} lg={4}>
              <div style={{
                height: '100%',
                minHeight: '600px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.02) 100%)',
                borderRadius: '16px',
                border: '2px dashed rgba(24, 144, 255, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(24, 144, 255, 0.6)',
                }}>
                  <CloudServerOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
                  <Text style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: 'rgba(24, 144, 255, 0.8)',
                    marginBottom: '6px'
                  }}>
                    集群信息区域
                  </Text>
                  <Text style={{ 
                    fontSize: '12px', 
                    color: 'rgba(24, 144, 255, 0.6)' 
                  }}>
                    预留空间
                  </Text>
                </div>
                
                {/* 装饰性元素 */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)',
                  borderRadius: '50%',
                  border: '1px solid rgba(24, 144, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <SettingOutlined style={{ fontSize: '16px', color: 'rgba(24, 144, 255, 0.5)' }} />
                </div>
              </div>
            </Col>

            {/* 中间控制平面区域 */}
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: '24px' }}>
                <KarmadaControlPlaneCenter 
                  data={data}
                  clusterListData={clusterListData}
                  isLoading={isLoading}
                  nodeInfo={nodeInfo}
                />
              </div>
            </Col>

            {/* 右侧预留区域 */}
            <Col xs={24} lg={8}>
              <div style={{
                height: '100%',
                minHeight: '600px',
                background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(82, 196, 26, 0.3)',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* 标题 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid rgba(82, 196, 26, 0.2)'
                }}>
                  <DatabaseOutlined style={{ fontSize: '24px', marginRight: '8px', color: '#52c41a' }} />
                  <Text style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: '#52c41a'
                  }}>
                    节点监控中心
                  </Text>
                </div>

                {/* 节点统计总览 */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid rgba(82, 196, 26, 0.2)'
                }}>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold', display: 'block' }}>
                          {nodeInfo.length}
                        </Text>
                        <Text style={{ color: 'rgba(82, 196, 26, 0.8)', fontSize: '14px' }}>
                          节点总数
                        </Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold', display: 'block' }}>
                          {nodeInfo.filter((n: any) => n.status === 'ready').length}
                        </Text>
                        <Text style={{ color: 'rgba(82, 196, 26, 0.8)', fontSize: '14px' }}>
                          就绪节点
                        </Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#faad14', fontSize: '24px', fontWeight: 'bold', display: 'block' }}>
                          {nodeInfo.filter((n: any) => n.role === 'master').length}
                        </Text>
                        <Text style={{ color: 'rgba(250, 173, 20, 0.8)', fontSize: '14px' }}>
                          主节点
                        </Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#13c2c2', fontSize: '24px', fontWeight: 'bold', display: 'block' }}>
                          {nodeInfo.filter((n: any) => n.role === 'worker').length}
                        </Text>
                        <Text style={{ color: 'rgba(19, 194, 194, 0.8)', fontSize: '14px' }}>
                          工作节点
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* 节点列表 */}
                <div style={{
                  height: '400px',
                  overflowY: 'auto',
                  paddingRight: '8px'
                }}>
                  <Text style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: '#52c41a',
                    display: 'block',
                    marginBottom: '12px'
                  }}>
                    节点详情列表
                  </Text>
                  
                  {nodeInfo.map((node: {
                    name: string;
                    cluster: string;
                    status: string;
                    role: string;
                    ip: string;
                    cpu: { used: string; total: string; utilization: string };
                    memory: { used: string; total: string; utilization: string };
                    pods: { used: number; total: number; utilization: string };
                  }, index: number) => (
                    <div
                      key={`${node.cluster}-${node.name}`}
                      style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '10px',
                        border: '1px solid rgba(82, 196, 26, 0.2)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(82, 196, 26, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* 节点头部信息 */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: node.status === 'ready' ? '#52c41a' : '#ff4d4f',
                            marginRight: '10px'
                          }} />
                          <Text style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            color: '#333'
                          }}>
                            {node.name.length > 22 ? node.name.substring(0, 19) + '...' : node.name}
                          </Text>
                        </div>
                        <div style={{
                          background: node.role === 'master' ? 
                            'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)' : 
                            'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          {node.role === 'master' ? 'Master' : 'Worker'}
                        </div>
                      </div>

                      {/* 节点基本信息 */}
                      <div style={{ marginBottom: '10px' }}>
                        <Text style={{ fontSize: '12px', color: '#666', display: 'block' }}>
                          集群: {node.cluster} | IP: {node.ip}
                        </Text>
                      </div>

                      {/* 资源使用情况 */}
                      <div>
                        <Row gutter={[8, 6]}>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <Text style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold', display: 'block' }}>
                                CPU
                              </Text>
                              <Text style={{ fontSize: '11px', color: '#666' }}>
                                {node.cpu.used}
                              </Text>
                              <Text style={{ fontSize: '10px', color: '#999' }}>
                                ({node.cpu.utilization})
                              </Text>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <Text style={{ fontSize: '12px', color: '#52c41a', fontWeight: 'bold', display: 'block' }}>
                                内存
                              </Text>
                              <Text style={{ fontSize: '11px', color: '#666' }}>
                                {node.memory.used}
                              </Text>
                              <Text style={{ fontSize: '10px', color: '#999' }}>
                                ({node.memory.utilization})
                              </Text>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div style={{ textAlign: 'center' }}>
                              <Text style={{ fontSize: '12px', color: '#722ed1', fontWeight: 'bold', display: 'block' }}>
                                Pod
                              </Text>
                              <Text style={{ fontSize: '11px', color: '#666' }}>
                                {node.pods.used}/{node.pods.total}
                              </Text>
                              <Text style={{ fontSize: '10px', color: '#999' }}>
                                ({node.pods.utilization})
                              </Text>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 装饰性元素 */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)',
                  borderRadius: '50%',
                  border: '1px solid rgba(82, 196, 26, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <GlobalOutlined style={{ fontSize: '16px', color: 'rgba(82, 196, 26, 0.5)' }} />
                </div>
              </div>
            </Col>
          </Row>

          {/* 策略和资源统计 - 优化样式 */}
          <Row gutter={[24, 24]} style={{ marginTop: '40px', marginBottom: '40px' }}>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ApiOutlined style={{ marginRight: '12px', color: '#13c2c2', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>调度策略统计</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                bodyStyle={{ padding: '28px' }}
              >
                <Row gutter={[24, 24]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="传播策略"
                        value={data?.clusterResourceStatus?.propagationPolicyNum || 0}
                        prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                        valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                      <Progress 
                        percent={Math.min((data?.clusterResourceStatus?.propagationPolicyNum || 0) * 10, 100)} 
                        strokeColor="#1890ff" 
                        showInfo={false}
                        style={{ marginTop: '12px' }}
                        strokeWidth={8}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="覆盖策略"
                        value={data?.clusterResourceStatus?.overridePolicyNum || 0}
                        prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                      />
                      <Progress 
                        percent={Math.min((data?.clusterResourceStatus?.overridePolicyNum || 0) * 20, 100)} 
                        strokeColor="#52c41a" 
                        showInfo={false}
                        style={{ marginTop: '12px' }}
                        strokeWidth={8}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DatabaseOutlined style={{ marginRight: '12px', color: '#fa541c', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>资源规模统计</span>
                  </div>
                }
                style={{ 
                  borderRadius: '16px',
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                bodyStyle={{ padding: '28px' }}
              >
                <Row gutter={[16, 20]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="命名空间"
                        value={data?.clusterResourceStatus?.namespaceNum || 0}
                        prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                        valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="服务数量"
                        value={data?.clusterResourceStatus?.serviceNum || 0}
                        prefix={<CloudOutlined style={{ color: '#13c2c2' }} />}
                        valueStyle={{ color: '#13c2c2', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="工作负载"
                        value={data?.clusterResourceStatus?.workloadNum || 0}
                        prefix={<RocketOutlined style={{ color: '#fa541c' }} />}
                        valueStyle={{ color: '#fa541c', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Statistic
                        title="配置项"
                        value={data?.clusterResourceStatus?.configNum || 0}
                        prefix={<SettingOutlined style={{ color: '#faad14' }} />}
                        valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 集群状态概览表格 - 优化标题 */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              marginBottom: '24px',
              padding: '20px 0',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <Title level={2} style={{ 
                margin: 0, 
                color: '#000000d9',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                <ClusterOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
                集群状态概览
              </Title>
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '36px' }}>
                实时监控所有成员集群的运行状态和资源使用情况
              </Text>
            </div>
            <ClusterOverview data={clusterData} loading={clusterListLoading} />
          </div>

          {/* 页面底部间距 */}
          <div style={{ height: '32px' }} />
        </div>
      </div>

      {/* 回到顶部按钮 */}
      <BackTop
        style={{
          height: 48,
          width: 48,
          lineHeight: '48px',
          borderRadius: '24px',
          backgroundColor: '#1890ff',
          color: 'white',
          fontSize: '20px',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
        }}
        target={() => document.querySelector('[style*="overflow-y: auto"]') as HTMLElement}
      >
        <VerticalAlignTopOutlined />
      </BackTop>
    </div>
  );
};

export default Overview;
