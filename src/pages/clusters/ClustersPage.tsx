import React from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Server, AlertCircle, CheckCircle } from 'lucide-react';

const ClustersPage: React.FC = () => {
  const mockClusters = [
    { name: 'us-west-2', status: 'Ready', nodes: 8, version: 'v1.28.0', syncMode: 'Push' },
    { name: 'us-east-1', status: 'Ready', nodes: 12, version: 'v1.28.0', syncMode: 'Pull' },
    { name: 'eu-west-1', status: 'Warning', nodes: 6, version: 'v1.27.5', syncMode: 'Push' },
    { name: 'asia-pacific', status: 'Ready', nodes: 15, version: 'v1.28.0', syncMode: 'Pull' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
            Cluster Management
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-2">
            Manage your member clusters across multiple cloud providers
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Add Cluster
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockClusters.map((cluster) => (
          <Card key={cluster.name} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Server className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    {cluster.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {cluster.status === 'Ready' ? (
                    <CheckCircle className="h-4 w-4 text-success-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    cluster.status === 'Ready' ? 'text-success-600' : 'text-warning-600'
                  }`}>
                    {cluster.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600 dark:text-secondary-400">Nodes</span>
                  <span className="font-medium text-secondary-900 dark:text-white">{cluster.nodes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600 dark:text-secondary-400">Version</span>
                  <span className="font-medium text-secondary-900 dark:text-white">{cluster.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600 dark:text-secondary-400">Sync Mode</span>
                  <span className="font-medium text-secondary-900 dark:text-white">{cluster.syncMode}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClustersPage;