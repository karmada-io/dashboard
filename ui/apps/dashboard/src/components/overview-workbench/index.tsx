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

import type { ReactNode } from 'react';
import { Progress } from 'antd';
import styles from './index.module.less';

type OverviewTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface OverviewStatus {
  label: ReactNode;
  tone?: OverviewTone;
}

export interface OverviewInfoItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
}

export interface OverviewMetricItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
}

export interface OverviewMetricGroup {
  key: string;
  title: ReactNode;
  description?: ReactNode;
  items: OverviewMetricItem[];
}

export interface OverviewUtilizationItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  percent?: number | null;
  meta?: ReactNode;
  tone?: OverviewTone;
}

export interface OverviewWorkbenchProps {
  scopeLabel: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status: OverviewStatus;
  infoTitle: ReactNode;
  infoItems: OverviewInfoItem[];
  utilizationTitle?: ReactNode;
  utilizationItems?: OverviewUtilizationItem[];
  metricGroups?: OverviewMetricGroup[];
}

const toneClassMap: Record<OverviewTone, string> = {
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  neutral: styles.toneNeutral,
  info: styles.toneInfo,
};

const progressColorMap: Record<OverviewTone, string> = {
  success: '#18794e',
  warning: '#b7791f',
  danger: '#c2410c',
  neutral: '#6b7280',
  info: '#1f6feb',
};

function normalizePercent(percent?: number | null) {
  if (percent === undefined || percent === null || Number.isNaN(percent)) {
    return 0;
  }
  return Math.max(0, Math.min(100, percent));
}

export default function OverviewWorkbench({
  scopeLabel,
  title,
  subtitle,
  status,
  infoTitle,
  infoItems,
  utilizationTitle,
  utilizationItems = [],
  metricGroups = [],
}: OverviewWorkbenchProps) {
  const hasUtilization = utilizationItems.length > 0;
  const hasMetrics = metricGroups.length > 0;
  const statusTone = status.tone ?? 'neutral';

  return (
    <div className={styles.workbench}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.scope}>{scopeLabel}</div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={`${styles.statusPill} ${toneClassMap[statusTone]}`}>
          <span className={styles.statusDot} />
          <span>{status.label}</span>
        </div>
      </section>

      <section className={styles.primaryGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{infoTitle}</h3>
          </div>
          <dl className={styles.infoGrid}>
            {infoItems.map((item) => (
              <div key={item.key} className={styles.infoItem}>
                <dt className={styles.itemLabel}>{item.label}</dt>
                <dd className={styles.itemValue}>{item.value}</dd>
                {item.meta && <dd className={styles.itemMeta}>{item.meta}</dd>}
              </div>
            ))}
          </dl>
        </article>

        {hasUtilization && (
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>{utilizationTitle}</h3>
            </div>
            <div className={styles.utilizationList}>
              {utilizationItems.map((item) => {
                const tone = item.tone ?? 'info';
                const percent = normalizePercent(item.percent);
                return (
                  <div key={item.key} className={styles.utilizationItem}>
                    <div className={styles.utilizationHead}>
                      <span className={styles.itemLabel}>{item.label}</span>
                      <span className={styles.utilizationValue}>{item.value}</span>
                    </div>
                    <Progress
                      percent={percent}
                      showInfo={false}
                      size="small"
                      strokeColor={progressColorMap[tone]}
                      railColor="#e8edf4"
                    />
                    {item.meta && <div className={styles.itemMeta}>{item.meta}</div>}
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </section>

      {hasMetrics && (
        <section
          className={`${styles.metricGroups} ${
            metricGroups.length === 1 ? styles.metricGroupsSingle : ''
          }`}
        >
          {metricGroups.map((group) => (
            <article key={group.key} className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>{group.title}</h3>
                  {group.description && (
                    <p className={styles.panelDescription}>{group.description}</p>
                  )}
                </div>
              </div>
              <div className={styles.metricGrid}>
                {group.items.map((item) => (
                  <div key={item.key} className={styles.metricItem}>
                    <div className={styles.metricValue}>{item.value}</div>
                    <div className={styles.itemLabel}>{item.label}</div>
                    {item.meta && <div className={styles.itemMeta}>{item.meta}</div>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
