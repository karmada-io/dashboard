import React from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import { Package } from 'lucide-react';

const WorkloadsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Workload Management
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-2">
          Manage deployments, services, and configurations across clusters
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Package className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Workloads
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-secondary-600 dark:text-secondary-400">
            Workloads page coming soon...
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default WorkloadsPage;