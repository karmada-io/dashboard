import React from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import { Shield } from 'lucide-react';

const PoliciesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
          Policy Management
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-2">
          Configure propagation and override policies for multi-cluster deployments
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Policies
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-secondary-600 dark:text-secondary-400">
            Policies page coming soon...
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default PoliciesPage;