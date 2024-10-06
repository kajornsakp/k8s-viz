import { NextResponse } from 'next/server';
import { getKubernetesData } from '@/lib/kubernetes';

export async function GET() {
  try {
    const data = await getKubernetesData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Kubernetes data:', error);
    return NextResponse.json({ error: 'Failed to fetch Kubernetes data' }, { status: 500 });
  }
}
