import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Network, ZoomIn, ZoomOut, RotateCw, Download, Filter } from "lucide-react";

interface GraphData {
  nodes: Array<{ id: string; label: string; risk: number; pagerank: number }>;
  edges: Array<{ source: string; target: string; value: number; timestamp: string }>;
}

interface GraphVisualizationProps {
  data: GraphData;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterRisk, setFilterRisk] = useState([0]);
  const [selectedLayout, setSelectedLayout] = useState("force");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const filteredNodes = data.nodes.filter(node => node.risk >= filterRisk[0]);
  const filteredEdges = data.edges.filter(edge => 
    filteredNodes.some(n => n.id === edge.source) && 
    filteredNodes.some(n => n.id === edge.target)
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    drawGraph(ctx, canvas.offsetWidth, canvas.offsetHeight);
  }, [filteredNodes, filteredEdges, zoomLevel, selectedLayout]);

  const drawGraph = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas with dark background for better contrast
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Store calculated node positions for rendering
    const positions = new Map<string, { x: number; y: number }>();
    
    // ==========================================
    // GRAPH LAYOUT ALGORITHMS
    // Different algorithms serve different analytical purposes
    // ==========================================
    
    if (selectedLayout === "circular") {
      // ==========================================
      // CIRCULAR LAYOUT ALGORITHM
      // Best for: Small to medium networks, equal node visibility
      // Time Complexity: O(n) where n = number of nodes
      // Use case: When you want to see all nodes clearly without clustering
      // ==========================================
      
      filteredNodes.forEach((node, i) => {
        // Distribute nodes evenly around a circle
        // Formula: angle = (index / total_nodes) * 2π
        const angle = (i / filteredNodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.35; // 35% of canvas size
        
        // Convert polar coordinates (angle, radius) to Cartesian (x, y)
        positions.set(node.id, {
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius
        });
      });
      
    } else if (selectedLayout === "hierarchical") {
      // ==========================================
      // HIERARCHICAL LAYOUT ALGORITHM  
      // Best for: Risk-based analysis, showing levels of suspicion
      // Time Complexity: O(n log n) due to sorting
      // Use case: When risk levels are primary concern
      // ==========================================
      
      // Sort nodes by risk level (highest risk at top)
      const sortedNodes = [...filteredNodes].sort((a, b) => b.risk - a.risk);
      const layers = 4; // Number of risk tiers
      const nodesPerLayer = Math.ceil(sortedNodes.length / layers);
      
      sortedNodes.forEach((node, i) => {
        // Calculate which layer (risk tier) this node belongs to
        const layer = Math.floor(i / nodesPerLayer);
        const posInLayer = i % nodesPerLayer; // Position within the layer
        const layerNodes = Math.min(nodesPerLayer, sortedNodes.length - layer * nodesPerLayer);
        
        // Distribute nodes evenly within each layer
        positions.set(node.id, {
          x: (width / (layerNodes + 1)) * (posInLayer + 1), // Spread across width
          y: (height / (layers + 1)) * (layer + 1)          // Layer by layer vertically
        });
      });
      
    } else {
      // ==========================================
      // FORCE-DIRECTED LAYOUT (SIMPLIFIED)
      // Best for: Natural clustering, showing network structure
      // Time Complexity: O(n) for this simplified version
      // Use case: When network topology and clustering are important
      // 
      // NOTE: Real force-directed algorithms use iterative physics simulation
      // with spring forces (attraction) and electrical forces (repulsion)
      // This is a simplified random placement with some clustering logic
      // ==========================================
      
      filteredNodes.forEach((node, i) => {
        // Start with circular distribution as base
        const angle = (i / filteredNodes.length) * 2 * Math.PI;
        const baseRadius = Math.min(width, height) * 0.3;
        
        // Apply risk-based clustering: higher risk nodes cluster toward center
        const riskFactor = 1 - (node.risk * 0.5); // Risk adjustment factor [0.5, 1.0]
        const radius = baseRadius * riskFactor;
        
        // Add some randomness to create more natural-looking clusters
        const randomOffset = (Math.random() - 0.5) * 100;
        
        positions.set(node.id, {
          x: width / 2 + Math.cos(angle) * radius + randomOffset,
          y: height / 2 + Math.sin(angle) * radius + randomOffset
        });
      });
    }

    // Draw edges
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    filteredEdges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      
      if (sourcePos && targetPos) {
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    filteredNodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      // Node size based on PageRank
      const radius = 3 + (node.pagerank * 1000);
      
      // Node color based on risk
      let color = '#10b981'; // Low risk (green)
      if (node.risk >= 0.8) color = '#ef4444'; // High risk (red)
      else if (node.risk >= 0.6) color = '#f59e0b'; // Medium risk (orange)
      else if (node.risk >= 0.4) color = '#8b5cf6'; // Low-medium risk (purple)

      // Draw node
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw node border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight hovered node
      if (hoveredNode === node.id) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Simple click detection (would need proper implementation)
    console.log('Clicked at:', x, y);
  };

  const exportGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'ethereum-fraud-graph.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Graph Visualization Controls
          </CardTitle>
          <CardDescription>
            Interactive network analysis of Ethereum transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Layout Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Layout Algorithm</label>
              <Select value={selectedLayout} onValueChange={setSelectedLayout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force-Directed</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Risk Threshold: {(filterRisk[0] * 100).toFixed(0)}%
              </label>
              <Slider
                value={filterRisk}
                onValueChange={setFilterRisk}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zoom Level</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-mono">{(zoomLevel * 100).toFixed(0)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export</label>
              <Button onClick={exportGraph} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export PNG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph Canvas */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Network Graph</CardTitle>
              <CardDescription>
                {filteredNodes.length} nodes, {filteredEdges.length} edges displayed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Filter className="h-3 w-3 mr-1" />
                Risk ≥ {(filterRisk[0] * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full h-96 border border-border rounded-lg cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}
            />
            
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur rounded-lg p-3 border border-border">
              <h4 className="text-sm font-medium mb-2">Risk Levels</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span>Low Risk (&lt;40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Medium-Low (40-60%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <span>Medium (60-80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span>High Risk (&gt;80%)</span>
                </div>
              </div>
            </div>

            {/* Loading overlay for complex layouts */}
            <div className="absolute inset-0 bg-background/50 backdrop-blur rounded-lg hidden">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RotateCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Calculating layout...</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{filteredNodes.length}</p>
              <p className="text-sm text-muted-foreground">Visible Nodes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{filteredEdges.length}</p>
              <p className="text-sm text-muted-foreground">Visible Edges</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {filteredNodes.filter(n => n.risk >= 0.6).length}
              </p>
              <p className="text-sm text-muted-foreground">High Risk Nodes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GraphVisualization;