/*
Copyright 2026 The Karmada Authors.

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

import { Select, Tag } from 'antd';
import { useClusters, useCluster } from '@/hooks';
import { useNavigate, useParams } from 'react-router-dom';

export const KarmadaClusterSelector = () => {
  const { data = [] } = useClusters();
  const { setCurrentCluster } = useCluster();
  const navigate = useNavigate();
  const params = useParams<{
    memberCluster: string;
  }>();
  const handleChange = (value: string) => {
    if (value === 'control-plane') {
      navigate('/overview');
      return;
    }
    setCurrentCluster(value);
    navigate(`/member-cluster/${value}/overview`);
  };

  return (
    <Select
      className="min-w-[230px] mr-[10px]"
      size="middle"
      variant="outlined"
      value={params.memberCluster || 'control-plane'}
      onChange={handleChange}
    >
      <Select.Option value="control-plane">
        <div className="flex flex-row justify-between items-center">
          <span className="mr-[2]">Karmada</span>
          <Tag color="green" variant="filled">
            control-plane
          </Tag>
        </div>
      </Select.Option>
      {data.map((cluster) => (
        <Select.Option
          key={cluster.objectMeta.name}
          value={cluster.objectMeta.name}
        >
          <div className="flex flex-row justify-between items-center">
            <span className="mr-[2]">{cluster.objectMeta.name}</span>
            <Tag color="blue" variant="filled">
              member-cluster
            </Tag>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};
