# Product

## Register

product

## Users
Karmada dashboard is used by platform engineers, SREs, and cluster administrators operating multi-cluster Kubernetes fleets. They typically work in an operations context, often switching between incident triage, routine inspection, and policy/resource management. Their primary job is to understand control-plane health and quickly act on cluster, policy, and workload changes.

## Product Purpose
Karmada Dashboard provides a web control plane for Karmada multi-cluster management. It centralizes visibility and operations for control-plane status, member clusters, policies, and resources so operators can make safe, fast decisions without relying only on CLI flows. Success means users can reliably detect status issues, locate affected scopes, and complete common management actions with low cognitive load.

## Brand Personality
Pragmatic, trustworthy, and precise. The UI tone should feel operationally calm and technically credible, with clear hierarchy and no decorative noise. It should communicate confidence during normal operation and clarity during degraded states.

## Anti-references
- Consumer-style marketing aesthetics that prioritize decoration over information density.
- Heavy visual effects (glassmorphism, oversized gradients, ornamental motion) that reduce readability.
- Inconsistent admin surfaces where each page invents its own interaction model.
- Ambiguous status presentation that hides failures behind neutral styling.

## Design Principles
- Operational clarity first: expose the most decision-critical signals early and clearly.
- Consistency over novelty: shared patterns for tables, filters, status, and actions across pages.
- Progressive disclosure: summarize first, then reveal detail when users need to drill down.
- State-complete interfaces: loading, empty, error, and success states are explicit and actionable.
- International-ready and accessible by default: i18n-ready copy, keyboard-visible focus, and readable contrast.

## Accessibility & Inclusion
Target WCAG AA contrast for text and controls. Preserve visible focus indicators for keyboard navigation. Keep motion minimal and functional, with no dependency on animation for understanding status. Ensure key operational information is conveyed by text, not color alone, and keep copy translatable for multilingual operators.
