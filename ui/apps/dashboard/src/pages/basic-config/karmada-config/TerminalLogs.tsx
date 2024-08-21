import React from 'react';
import { Tabs } from 'antd';

interface TerminalLogsProps {
  logs: Record<string, string>;
}

const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => (
  <Tabs
    type="card"
    items={Object.entries(logs).map(([podName, log]) => ({
      label: podName,
      key: podName,
      children: (
        <div
          style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '4px',
            padding: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <pre
            style={{
              color: '#00ff00',
              margin: 0,
              fontFamily: '"Consolas", "Courier New", monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {log}
          </pre>
        </div>
      )
    }))}
  />
);

export default TerminalLogs;