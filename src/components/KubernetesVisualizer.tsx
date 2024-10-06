import React from 'react';
import { getKubernetesData } from '@/lib/kubernetes';
import KubernetesVisualizerClient from './KubernetesVisualizerClient';

const KubernetesVisualizerContainer = async () => {
  const initialNodes = await getKubernetesData();

  return <KubernetesVisualizerClient initialNodes={initialNodes} />;
};

export default KubernetesVisualizerContainer;
