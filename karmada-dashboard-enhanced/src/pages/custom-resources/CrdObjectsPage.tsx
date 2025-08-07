import React from 'react';
import { useParams } from 'react-router-dom';

const CrdObjectsPage: React.FC = () => {
  const { crdName } = useParams<{ crdName: string }>();

  return (
    <div>
      <h1>Objects for {crdName}</h1>
      {/* Add your content here */}
    </div>
  );
};

export default CrdObjectsPage;
