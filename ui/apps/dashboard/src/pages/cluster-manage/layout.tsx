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
import { Outlet } from 'react-router-dom';

/**
 * 集群管理布局组件
 * 这个组件仅用于布局，包含 Outlet 组件以支持嵌套路由
 */
const ClusterManageLayout: React.FC = () => {
  return (
    <div className="cluster-manage-layout">
      <Outlet />
    </div>
  );
};

export default ClusterManageLayout; 