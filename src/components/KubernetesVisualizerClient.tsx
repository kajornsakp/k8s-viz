'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  OutlinedInput, 
  Chip,
  Box,
  SelectChangeEvent,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Tooltip
} from '@mui/material';

interface Node {
  name: string;
  ip: string;
  status: string;
  pods: Pod[];
}

interface Pod {
  name: string;
  containers: Container[];
  annotations: { [key: string]: string };
  labels: { [key: string]: string };
  status: 'Ready' | 'Pending' | 'Terminating' | 'Failed';
}

interface Container {
  name: string;
}

interface LabelFilters {
  [key: string]: string[];
}

const statusColors = {
  Ready: 'bg-green-500',
  Pending: 'bg-yellow-500',
  Terminating: 'bg-orange-500',
  Failed: 'bg-red-500',
};

const PodInfo = ({ pod }: { pod: Pod }) => (
  <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg p-4 max-w-xs">
    <h4 className="font-semibold mb-2">Annotations:</h4>
    <ul className="list-disc list-inside mb-2">
      {Object.entries(pod.annotations).map(([key, value]) => (
        <li key={key} className="text-sm">
          {key}: {value}
        </li>
      ))}
    </ul>
    <h4 className="font-semibold mb-2">Labels:</h4>
    <ul className="list-disc list-inside">
      {Object.entries(pod.labels).map(([key, value]) => (
        <li key={key} className="text-sm">
          {key}: {value}
        </li>
      ))}
    </ul>
  </div>
);

const PodComponent = ({ pod }: { pod: Pod }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div 
      className="mb-4 last:mb-0 bg-gray-50 rounded p-3 relative"
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800 mb-2">{pod.name}</h3>
        <span className={`px-2 py-1 rounded text-xs ${statusColors[pod.status]} text-white`}>
          {pod.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {pod.containers?.map((container) => (
          <span
            key={container.name}
            className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
          >
            {container.name}
          </span>
        ))}
      </div>
      {showInfo && <PodInfo pod={pod} />}
    </div>
  );
};

const MinimalPodComponent = ({ pod }: { pod: Pod }) => (
  <Tooltip title={`${pod.name} (${pod.status})`} arrow>
    <div className={`w-4 h-4 ${statusColors[pod.status]} rounded-sm m-1 cursor-pointer`} />
  </Tooltip>
);

const MinimalNodeComponent = ({ node }: { node: Node }) => (
  <div className="bg-white rounded-lg shadow-lg p-2 flex flex-col items-center">
    <Tooltip title={`IP: ${node.ip}, Status: ${node.status}`} arrow>
      <Typography variant="subtitle2" noWrap>
        {node.name}
      </Typography>
    </Tooltip>
    <div className="flex flex-wrap justify-center mt-1">
      {node.pods.map((pod) => (
        <MinimalPodComponent key={pod.name} pod={pod} />
      ))}
    </div>
  </div>
);

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const KubernetesVisualizer = ({ initialNodes }: { initialNodes: Node[] }) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [searchTerm, setSearchTerm] = useState('');
  const [labelFilters, setLabelFilters] = useState<LabelFilters>({});
  const [availableLabels, setAvailableLabels] = useState<LabelFilters>({});
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/kubernetes');
      const data = await response.json();
      setNodes(data);
    } catch (error) {
      console.error('Error fetching Kubernetes data:', error);
    }
  }, []);

  useEffect(() => {
    if (pollingInterval > 0) {
      const intervalId = setInterval(fetchData, pollingInterval * 1000);
      return () => clearInterval(intervalId);
    }
  }, [pollingInterval, fetchData]);

  useEffect(() => {
    const labels: LabelFilters = {};
    nodes.forEach(node => {
      node.pods.forEach(pod => {
        Object.entries(pod.labels).forEach(([key, value]) => {
          if (!labels[key]) {
            labels[key] = [];
          }
          if (!labels[key].includes(value)) {
            labels[key].push(value);
          }
        });
      });
    });
    setAvailableLabels(labels);
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.map(node => {
      const nodeNameMatches = node.name.toLowerCase().includes(searchTerm.toLowerCase());
      return {
        ...node,
        pods: node.pods.filter(pod => 
          (nodeNameMatches || 
           pod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           Object.values(pod.labels).some(label => 
             label.toLowerCase().includes(searchTerm.toLowerCase())
           )) &&
          Object.entries(labelFilters).every(([key, values]) => 
            values.length === 0 || values.some(value => pod.labels[key] === value)
          )
        )
      };
    }).filter(node => node.pods.length > 0);
  }, [nodes, searchTerm, labelFilters]);

  const handleLabelFilterChange = (event: SelectChangeEvent<string[]>, labelKey: string) => {
    const {
      target: { value },
    } = event;
    setLabelFilters(prev => ({
      ...prev,
      [labelKey]: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const clearFilters = () => {
    setLabelFilters({});
    setSearchTerm('');
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Kubernetes Cluster Visualizer</h1>
      <div className="mb-6">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, mr: 2 }}>
            <input
              type="text"
              placeholder="Search by node name, pod name, or pod label"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border border-gray-300 rounded mr-2 flex-grow"
            />
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={clearFilters}
              sx={{ height: '40px', flexShrink: 0 }}
            >
              Clear Filters
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel id="polling-interval-label">Refresh Interval</InputLabel>
              <Select
                labelId="polling-interval-label"
                value={pollingInterval.toString()}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                label="Refresh Interval"
              >
                <MenuItem value={0}>No refresh</MenuItem>
                <MenuItem value={5}>5 seconds</MenuItem>
                <MenuItem value={10}>10 seconds</MenuItem>
                <MenuItem value={30}>30 seconds</MenuItem>
                <MenuItem value={60}>1 minute</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={isDetailedView}
                  onChange={(e) => setIsDetailedView(e.target.checked)}
                  color="primary"
                />
              }
              label="Detailed View"
            />
          </Box>
        </Box>
        {isDetailedView && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {Object.entries(availableLabels).map(([key, values]) => (
              <FormControl key={key} sx={{ m: 1, width: 300 }}>
                <InputLabel id={`label-${key}-label`}>{key}</InputLabel>
                <Select
                  labelId={`label-${key}-label`}
                  id={`label-${key}`}
                  multiple
                  value={labelFilters[key] || []}
                  onChange={(event) => handleLabelFilterChange(event, key)}
                  input={<OutlinedInput label={key} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {values.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>
        )}
      </div>
      <div className={`grid gap-6 ${!isDetailedView ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {filteredNodes.map((node) => (
          !isDetailedView ? (
            <MinimalNodeComponent key={node.name} node={node} />
          ) : (
            <div key={node.name} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-xl font-semibold">{node.name}</h2>
                <p className="text-sm">IP: {node.ip}</p>
                <p className="text-sm">Status: {node.status}</p>
              </div>
              <div className="p-4">
                {node.pods.map((pod) => (
                  <PodComponent key={pod.name} pod={pod} />
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default KubernetesVisualizer;