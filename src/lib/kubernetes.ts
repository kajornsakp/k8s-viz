import * as k8s from '@kubernetes/client-node';

export async function getKubernetesData() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    try {
        const nodes = await k8sApi.listNode();
        const pods = await k8sApi.listPodForAllNamespaces();

        const formattedData = nodes.body.items.map((node) => {
            const nodePods = pods.body.items.filter(
                (pod) => pod.spec?.nodeName === node.metadata?.name
            );

            const nodeInternalIP = node.status?.addresses?.find(
                (address) => address.type === 'InternalIP'
            )?.address || 'Unknown';

            const nodeStatus = node.status?.conditions?.find(
                (condition) => condition.type === 'Ready'
            )?.status === 'True' ? 'Ready' : 'NotReady';

            return {
                name: node.metadata?.name,
                ip: nodeInternalIP,
                status: nodeStatus,
                pods: nodePods.map((pod) => ({
                    name: pod.metadata?.name,
                    containers: pod.spec?.containers.map((container) => ({
                        name: container.name,
                    })),
                    annotations: pod.metadata?.annotations || {},
                    labels: pod.metadata?.labels || {},
                    status: getPodStatus(pod),
                })),
            };
        });

        return formattedData;
    } catch (error) {
        console.error('Error fetching Kubernetes data:', error);
        throw new Error('Failed to fetch Kubernetes data');
    }
}

function getPodStatus(pod: k8s.V1Pod): 'Ready' | 'Pending' | 'Terminating' | 'Failed' {
    if (pod.metadata?.deletionTimestamp) {
        return 'Terminating';
    }
    
    const phase = pod.status?.phase;
    switch (phase) {
        case 'Pending':
            return 'Pending';
        case 'Failed':
            return 'Failed';
        case 'Running':
            const isReady = pod.status?.conditions?.some(
                (condition) => condition.type === 'Ready' && condition.status === 'True'
            );
            return isReady ? 'Ready' : 'Pending';
        default:
            return 'Pending';
    }
}