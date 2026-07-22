/**
 * Copyright 2024 The Karmada Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Skeleton, Spin } from 'antd';

interface LazyChartProps {
  children: ReactNode;
  height?: number;
  /** Whether data is still loading */
  loading?: boolean;
  /** Extra margin around viewport to pre-render (default 200px) */
  rootMargin?: string;
}

/**
 * LazyChart only renders its children (expensive chart SVGs) when the container
 * enters the viewport. Once rendered, it stays rendered to avoid flicker on
 * scroll back. Uses IntersectionObserver with rootMargin for pre-loading.
 * Shows independent loading skeleton when data is being fetched.
 */
export default function LazyChart({ children, height = 252, loading = false, rootMargin = '200px' }: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBeenVisible, rootMargin]);

  const placeholder = (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <Spin tip="Loading..." size="small">
          <div style={{ width: '100%', height: height - 32, padding: 16 }}>
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </div>
        </Spin>
      ) : (
        <Skeleton.Node active style={{ width: '100%', height: height - 16 }}>
          <div style={{ width: 48, height: 48 }} />
        </Skeleton.Node>
      )}
    </div>
  );

  return (
    <div ref={ref} style={{ minHeight: height, contentVisibility: 'auto', containIntrinsicSize: `auto ${height}px` }}>
      {hasBeenVisible && !loading ? children : placeholder}
    </div>
  );
}
