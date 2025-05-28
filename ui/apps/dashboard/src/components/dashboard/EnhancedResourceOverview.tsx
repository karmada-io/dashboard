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

import React, { useEffect, useState, useRef } from 'react';
import { Typography, Card, Row, Col, Progress, Spin } from 'antd';
import { 
  CloudServerOutlined, 
  NodeIndexOutlined,
  DatabaseOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  ApiOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ResourceStats {
  used: number;
  total: number;
}

interface EnhancedResourceOverviewProps {
  nodeStats: ResourceStats;
  cpuStats: ResourceStats;
  memoryStats: ResourceStats;
  podStats: ResourceStats;
  loading?: boolean;
}

// 粒子背景组件
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
    }> = [];

    // 创建粒子
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制粒子
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // 边界反弹
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        // 绘制粒子
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${particle.alpha})`;
        ctx.fill();
        
        // 绘制连线
        particles.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
      
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
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
  );
};

// 科技风格进度环
const TechProgressRing: React.FC<{
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  used: number;
  total: number;
  unit: string;
  icon: React.ReactNode;
}> = ({ percentage, size, strokeWidth, color, label, used, total, unit, icon }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedUsed, setAnimatedUsed] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedPercentage(percentage * easeOutCubic);
      setAnimatedUsed(used * easeOutCubic);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [percentage, used]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div 
      className="tech-progress-ring"
      style={{ 
        width: size, 
        height: size, 
        position: 'relative',
        margin: '0 auto'
      }}
    >
      {/* 外发光效果 */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: -10,
          right: -10,
          bottom: -10,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}20, transparent 70%)`,
          animation: 'pulse 2s ease-in-out infinite alternate',
        }}
      />
      
      <svg width={size} height={size} style={{ position: 'relative', zIndex: 2 }}>
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="50%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${label})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter={`url(#glow-${label})`}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
        
        {/* 中心内容 */}
        <foreignObject x="0" y="0" width={size} height={size}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
          }}>
            <div 
              style={{
                fontSize: '24px',
                marginBottom: '4px',
                color: color,
                filter: `drop-shadow(0 0 6px ${color})`,
              }}
            >
              {icon}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '2px' }}>
              {Math.round(animatedPercentage)}%
            </div>
            <div style={{ fontSize: '12px', textAlign: 'center' }}>
              <div>{label}</div>
              <div style={{ opacity: 0.7 }}>
                {animatedUsed.toFixed(1)}/{total.toFixed(1)} {unit}
              </div>
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
};

// 科技感数据卡片
const TechDataCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, subtitle, icon, color, trend = 'stable' }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedValue(value * easeOutCubic);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [value]);

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return '#52c41a';
      case 'down': return '#ff4d4f';
      default: return color;
    }
  };

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.8) 0%, rgba(0, 20, 40, 0.9) 100%)',
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${color}30`,
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${color}20`,
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          background: `radial-gradient(circle, ${color}15, transparent)`,
          borderRadius: '50%',
        }}
      />
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              background: color,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontSize: '18px',
              color: 'white',
              boxShadow: `0 4px 15px ${color}40`,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
              {title}
            </Text>
          </div>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <Text style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: 'white',
            textShadow: `0 0 10px ${color}`,
          }}>
            {typeof value === 'number' ? Math.round(animatedValue) : value}
          </Text>
        </div>
        
        <Text style={{ 
          color: getTrendColor(), 
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {subtitle}
        </Text>
      </div>
    </div>
  );
};

const EnhancedResourceOverview: React.FC<EnhancedResourceOverviewProps> = ({
  nodeStats,
  cpuStats,
  memoryStats,
  podStats,
  loading = false,
}) => {
  const calculatePercentage = (used: number, total: number): number => {
    return total > 0 ? (used / total) * 100 : 0;
  };

  if (loading) {
    return (
      <Card
        style={{
          height: '500px',
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
          border: 'none',
          borderRadius: '16px',
        }}
        bodyStyle={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </Card>
    );
  }

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        border: 'none',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '500px',
      }}
      bodyStyle={{ padding: '32px', position: 'relative', zIndex: 3 }}
    >
      {/* 粒子背景 */}
      <ParticleBackground />
      
      {/* 装饰性背景元素 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 20, 147, 0.05) 0%, transparent 50%)
          `,
          zIndex: 2,
        }}
      />
      
      <div style={{ position: 'relative', zIndex: 3 }}>
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Text style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: 'white',
            textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
          }}>
            成员集群资源概览
          </Text>
          <div style={{ 
            fontSize: '14px', 
            color: 'rgba(255, 255, 255, 0.6)', 
            marginTop: '8px' 
          }}>
            Control Plane Management Center
          </div>
        </div>

        {/* 核心资源环形图 */}
        <Row gutter={[32, 32]} style={{ marginBottom: '40px' }}>
          <Col xs={12} md={6}>
            <TechProgressRing
              percentage={calculatePercentage(nodeStats.used, nodeStats.total)}
              size={120}
              strokeWidth={8}
              color="#00d4ff"
              label="节点统计"
              used={nodeStats.used}
              total={nodeStats.total}
              unit="节点"
              icon={<NodeIndexOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <TechProgressRing
              percentage={calculatePercentage(cpuStats.used, cpuStats.total)}
              size={120}
              strokeWidth={8}
              color="#52c41a"
              label="CPU使用"
              used={cpuStats.used}
              total={cpuStats.total}
              unit="Core"
              icon={<ThunderboltOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <TechProgressRing
              percentage={calculatePercentage(memoryStats.used, memoryStats.total)}
              size={120}
              strokeWidth={8}
              color="#fa8c16"
              label="内存使用"
              used={memoryStats.used}
              total={memoryStats.total}
              unit="GB"
              icon={<DatabaseOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <TechProgressRing
              percentage={calculatePercentage(podStats.used, podStats.total)}
              size={120}
              strokeWidth={8}
              color="#eb2f96"
              label="Pod负载"
              used={podStats.used}
              total={podStats.total}
              unit="Pod"
              icon={<RocketOutlined />}
            />
          </Col>
        </Row>

        {/* 详细数据卡片 */}
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <TechDataCard
              title="集群健康度"
              value="98.7"
              subtitle="所有系统运行正常"
              icon={<CloudServerOutlined />}
              color="#00d4ff"
              trend="stable"
            />
          </Col>
          <Col xs={24} md={8}>
            <TechDataCard
              title="调度效率"
              value={`${Math.round(calculatePercentage(podStats.used, podStats.total))}`}
              subtitle="资源调度优化中"
              icon={<ApiOutlined />}
              color="#52c41a"
              trend="up"
            />
          </Col>
          <Col xs={24} md={8}>
            <TechDataCard
              title="平均负载"
              value={`${((cpuStats.used / cpuStats.total) * 100).toFixed(1)}`}
              subtitle="系统负载均衡"
              icon={<DatabaseOutlined />}
              color="#fa8c16"
              trend="stable"
            />
          </Col>
        </Row>

        {/* 底部状态栏 */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
        }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
            实时数据 · 最后更新: {dayjs().format('HH:mm:ss')} · 
            <span style={{ color: '#52c41a', marginLeft: '8px' }}>
              ● 系统运行正常
            </span>
          </Text>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        
        .tech-progress-ring:hover {
          transform: scale(1.05);
          transition: transform 0.3s ease;
        }
      `}</style>
    </Card>
  );
};

export default EnhancedResourceOverview; 