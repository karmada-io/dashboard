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

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'disabled';

interface TechStatusBadgeProps {
  status: StatusType;
  text: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const TechStatusBadge: React.FC<TechStatusBadgeProps> = ({
  status,
  text,
  icon,
  pulse = false,
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  const statusClasses = {
    success: 'tech-status-badge success',
    error: 'tech-status-badge error',
    warning: 'tech-status-badge warning',
    info: 'tech-status-badge info',
    disabled: 'tech-status-badge disabled'
  };

  const pulseClass = pulse ? 'tech-pulse' : '';

  return (
    <span 
      className={`
        ${statusClasses[status]} 
        ${sizeClasses[size]} 
        ${pulseClass} 
        ${className}
      `}
    >
      {icon && (
        <span className="mr-1 inline-flex items-center">
          {icon}
        </span>
      )}
      <span>{text}</span>
    </span>
  );
};

export default TechStatusBadge; 