import React from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import { Activity } from 'lucide-react';

const MonitoringPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Monitoring & Observability
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-2">
          Monitor cluster health, metrics, and performance across your infrastructure
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Monitoring
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-secondary-600 dark:text-secondary-400">
            Monitoring page coming soon...
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default MonitoringPage;