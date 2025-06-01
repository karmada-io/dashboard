import React, { ReactNode } from 'react';
import { BackTop } from 'antd';
import { VerticalAlignTopOutlined } from '@ant-design/icons';

interface ScrollContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showBackTop?: boolean;
  height?: string;
  padding?: string;
  background?: string;
}

const ScrollContainer: React.FC<ScrollContainerProps> = ({
  children,
  className = '',
  style = {},
  showBackTop = true,
  height = '100vh',
  padding = '24px',
  background = '#f0f2f5',
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollContainerRef}
      className={`custom-scroll-container ${className}`}
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding,
        background,
        position: 'relative',
        ...style,
      }}
    >
      {/* 自定义滚动条样式 */}
      <style>{`
        .custom-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: #1890ff rgba(0, 0, 0, 0.1);
        }
        
        .custom-scroll-container::-webkit-scrollbar {
          width: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        }
        
        .custom-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(240, 242, 245, 0.8) 0%, rgba(240, 242, 245, 0.6) 100%);
          border-radius: 6px;
          margin: 4px 0;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1890ff 0%, #40a9ff 50%, #69c0ff 100%);
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #096dd9 0%, #1890ff 50%, #40a9ff 100%);
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.5);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #0050b3 0%, #096dd9 50%, #1890ff 100%);
          box-shadow: 0 2px 6px rgba(24, 144, 255, 0.7);
        }
        
        /* 添加滚动条角落样式 */
        .custom-scroll-container::-webkit-scrollbar-corner {
          background: rgba(240, 242, 245, 0.8);
          border-radius: 6px;
        }
        
        /* 滚动时添加动画效果 */
        .custom-scroll-container {
          scroll-behavior: smooth;
        }
        
        /* 为滚动条添加阴影效果 */
        .custom-scroll-container::-webkit-scrollbar-track:active {
          background: linear-gradient(180deg, rgba(240, 242, 245, 0.9) 0%, rgba(240, 242, 245, 0.7) 100%);
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .custom-scroll-container::-webkit-scrollbar-track {
            background: linear-gradient(180deg, rgba(45, 47, 51, 0.8) 0%, rgba(45, 47, 51, 0.6) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .custom-scroll-container::-webkit-scrollbar-corner {
            background: rgba(45, 47, 51, 0.8);
          }
        }
        
        /* 响应式设计 - 移动端优化 */
        @media (max-width: 768px) {
          .custom-scroll-container::-webkit-scrollbar {
            width: 8px;
          }
        }
      `}</style>

      {children}

      {/* 回到顶部按钮 */}
      {showBackTop && (
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
            border: '2px solid rgba(255, 255, 255, 0.8)',
            transition: 'all 0.3s ease',
          }}
          target={() => scrollContainerRef.current as HTMLElement}
          onClick={() => {
            // 添加点击动画效果
            const backTopElement = document.querySelector('.ant-back-top') as HTMLElement;
            if (backTopElement) {
              backTopElement.style.transform = 'scale(0.9)';
              setTimeout(() => {
                backTopElement.style.transform = 'scale(1)';
              }, 150);
            }
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget.parentElement as HTMLElement;
              target.style.backgroundColor = '#40a9ff';
              target.style.transform = 'scale(1.1)';
              target.style.boxShadow = '0 6px 16px rgba(24, 144, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget.parentElement as HTMLElement;
              target.style.backgroundColor = '#1890ff';
              target.style.transform = 'scale(1)';
              target.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.4)';
            }}
          >
            <VerticalAlignTopOutlined />
          </div>
        </BackTop>
      )}
    </div>
  );
};

export default ScrollContainer; 