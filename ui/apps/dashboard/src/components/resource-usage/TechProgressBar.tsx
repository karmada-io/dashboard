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

import React from 'react';
import '../../styles/tech-theme.css';

interface TechProgressBarProps {
  percentage: number;
  label?: string;
  showValue?: boolean;
  size?: 'small' | 'medium' | 'large';
  status?: 'normal' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

const TechProgressBar: React.FC<TechProgressBarProps> = ({
  percentage,
  label,
  showValue = true,
  size = 'medium',
  status = 'normal',
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'linear-gradient(90deg, var(--success-color) 0%, #00ff88 50%, var(--success-color) 100%)';
      case 'warning':
        return 'linear-gradient(90deg, var(--warning-color) 0%, #ff8c00 50%, var(--warning-color) 100%)';
      case 'error':
        return 'linear-gradient(90deg, var(--error-color) 0%, #ff0080 50%, var(--error-color) 100%)';
      default:
        return 'linear-gradient(90deg, var(--tech-primary) 0%, var(--tech-primary-4) 50%, var(--tech-primary) 100%)';
    }
  };

  const formatValue = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className={`tech-progress-container ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">
              {label}
            </span>
          )}
          {showValue && (
            <span 
              className="text-sm font-semibold tech-hologram-text"
              style={{ color: 'var(--tech-primary)' }}
            >
              {formatValue(percentage)}
            </span>
          )}
        </div>
      )}
      
      <div className={`tech-progress ${sizeClasses[size]} relative`}>
        <div
          className={`tech-progress-bar ${animated ? 'animate-pulse' : ''}`}
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            background: getStatusColor()
          }}
        />
      </div>
    </div>
  );
};

export default TechProgressBar; 