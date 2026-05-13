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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer, Switch, message } from 'antd';
import { GetLogs, type LogDetails } from '@/services/member-cluster/log';

interface PodLogDrawerProps {
  memberClusterName: string;
  namespace: string;
  podName: string;
  open: boolean;
  onClose: () => void;
}

const PodLogDrawer = ({ memberClusterName, namespace, podName, open, onClose }: PodLogDrawerProps) => {
  const [logDetails, setLogDetails] = useState<LogDetails | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logAutoRefresh, setLogAutoRefresh] = useState(false);
  const [logAutoScroll, setLogAutoScroll] = useState(true);
  const logScrollRef = useRef<HTMLPreElement>(null);
  const logRefreshTimerRef = useRef<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const ret = await GetLogs({
        memberClusterName,
        namespace,
        pod: podName,
        tailLines: 200,
        timestamps: true,
      });
      setLogDetails(ret.data);
    } catch {
      void message.error('Failed to load pod logs');
    } finally {
      setLogLoading(false);
    }
  }, [memberClusterName, namespace, podName]);

  useEffect(() => {
    if (open) {
      setLogDetails(null);
      void fetchLogs();
    }
  }, [open, fetchLogs]);

  useEffect(() => {
    if (!logAutoRefresh || !open) return;
    const timer = window.setInterval(() => { void fetchLogs(); }, 5000);
    logRefreshTimerRef.current = timer;
    return () => { window.clearInterval(timer); logRefreshTimerRef.current = null; };
  }, [logAutoRefresh, open, fetchLogs]);

  useEffect(() => {
    if (!logAutoScroll || !logScrollRef.current) return;
    const hasContent = Boolean(logDetails?.podLogs?.logs?.length || logDetails?.logs?.length);
    if (!hasContent) return;
    logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [logAutoScroll, logDetails]);

  return (
    <Drawer
      title={podName ? `Logs: ${namespace}/${podName}` : 'Pod logs'}
      placement="right"
      size={800}
      open={open}
      onClose={() => {
        setLogDetails(null);
        setLogAutoRefresh(false);
        onClose();
      }}
      destroyOnHidden
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' } }}
    >
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-2">
          Auto-refresh:
          <Switch size="small" checked={logAutoRefresh} onChange={setLogAutoRefresh} />
        </span>
        <span className="flex items-center gap-2">
          Auto-scroll:
          <Switch size="small" checked={logAutoScroll} onChange={setLogAutoScroll} />
        </span>
      </div>
      {logLoading && <div className="text-sm text-gray-400">Loading logs...</div>}
      {!logLoading && !logDetails && <div className="text-sm text-gray-400">No logs</div>}
      {!logLoading && logDetails && (
        <div className="h-full flex flex-col">
          <div className="mb-2 text-xs text-gray-500">
            Container: {logDetails.info?.containerName || '-'} | From: {logDetails.info?.fromDate || '-'} | To: {logDetails.info?.toDate || '-'}
            {logDetails.info?.truncated && ' (truncated)'}
          </div>
          <pre ref={logScrollRef} className="flex-1 overflow-auto bg-black text-green-400 text-xs p-2 rounded">
            {logDetails.podLogs?.logs?.join('\n') ||
              logDetails.logs?.map((l) => `${l.timestamp} ${l.content}`).join('\n') ||
              'No log content'}
          </pre>
        </div>
      )}
    </Drawer>
  );
};

export default PodLogDrawer;
