import type { Component } from 'svelte';
import type { EvidencePack } from '../platform/types';

export type CustomRoute = { slug: string; label: string; component: Component<{ pack: EvidencePack }> };

// Add narrowly scoped mission-specific pages here. Do not recreate platform routes.
export const customRoutes: CustomRoute[] = [];
