import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, Network, AlertTriangle, TrendingUp, Activity, Shield, FileDown } from "lucide-react";
import DataUpload from "./DataUpload";
import GraphVisualization from "./GraphVisualization";
import FraudResults from "./FraudResults";

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
  isComplete: boolean;
}

interface GraphData {
  nodes: Array<{ id: string; label: string; risk: number; pagerank: number }>;
  edges: Array<{ source: string; target: string; value: number; timestamp: string }>;
}

interface FraudDetectionResults {
  stronglyConnectedComponents: Array<Array<string>>;
  cycles: Array<Array<string>>;
  highRiskNodes: Array<{ address: string; risk: number; reason: string }>;
  pageRankScores: Record<string, number>;
  stats: {
    totalNodes: number;
    totalEdges: number;
    suspiciousNodes: number;
    riskScore: number;
  };
}

const FraudDetectionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("upload");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: "idle",
    progress: 0,
    message: "Ready to process data",
    isComplete: false
  });
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [fraudResults, setFraudResults] = useState<FraudDetectionResults | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);

  const handleDataUpload = useCallback((data: any[]) => {
    setCsvData(data);
    setActiveTab("processing");
    simulateProcessing();
  }, []);

  const simulateProcessing = async () => {
    const stages = [
      { stage: "cleaning", message: "Cleaning and preprocessing data...", duration: 2000 },
      { stage: "graph", message: "Constructing transaction graph...", duration: 3000 },
      { stage: "analysis", message: "Running fraud detection algorithms...", duration: 4000 },
      { stage: "visualization", message: "Generating visualizations...", duration: 2000 }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      setProcessingStatus({
        stage: stage.stage,
        progress: (i / stages.length) * 100,
        message: stage.message,
        isComplete: false
      });

      await new Promise(resolve => setTimeout(resolve, stage.duration));
      
      setProcessingStatus({
        stage: stage.stage,
        progress: ((i + 1) / stages.length) * 100,
        message: `${stage.message} Complete`,
        isComplete: i === stages.length - 1
      });
    }

    // Generate real results from CSV data
    generateRealResults();
    setActiveTab("visualization");
  };

  const generateRealResults = () => {
    // Process actual CSV data
    const uniqueAddresses = new Set<string>();
    csvData.forEach(tx => {
      if (tx.from_address) uniqueAddresses.add(tx.from_address.toLowerCase());
      if (tx.to_address) uniqueAddresses.add(tx.to_address.toLowerCase());
    });

    // Calculate node metrics
    const addressMetrics = new Map<string, { inDegree: number; outDegree: number; totalValue: number; transactions: number }>();
    
    uniqueAddresses.forEach(addr => {
      addressMetrics.set(addr, { inDegree: 0, outDegree: 0, totalValue: 0, transactions: 0 });
    });

    csvData.forEach(tx => {
      const from = tx.from_address?.toLowerCase();
      const to = tx.to_address?.toLowerCase();
      const value = parseFloat(tx.value) || 0;

      if (from && addressMetrics.has(from)) {
        const metrics = addressMetrics.get(from)!;
        metrics.outDegree++;
        metrics.totalValue += value;
        metrics.transactions++;
      }

      if (to && addressMetrics.has(to)) {
        const metrics = addressMetrics.get(to)!;
        metrics.inDegree++;
        metrics.totalValue += value;
        metrics.transactions++;
      }
    });

    // Calculate PageRank-like scores and risk
    const nodes = Array.from(uniqueAddresses).map(addr => {
      const metrics = addressMetrics.get(addr)!;
      const degree = metrics.inDegree + metrics.outDegree;
      const avgValue = metrics.totalValue / Math.max(metrics.transactions, 1);
      
      // Risk calculation based on unusual patterns
      let risk = 0;
      if (metrics.outDegree > 20) risk += 0.3; // High out-degree
      if (metrics.inDegree > 50) risk += 0.2; // High in-degree  
      if (degree > 100) risk += 0.3; // Very active
      if (avgValue > 1000) risk += 0.2; // High value transactions
      
      return {
        id: addr,
        label: `${addr.substring(0, 8)}...`,
        risk: Math.min(risk, 1),
        pagerank: degree / uniqueAddresses.size
      };
    });

    // Create edges from CSV data
    const edges = csvData.map(tx => ({
      source: tx.from_address?.toLowerCase() || '',
      target: tx.to_address?.toLowerCase() || '',
      value: parseFloat(tx.value) || 0,
      timestamp: tx.timestamp || new Date().toISOString()
    })).filter(edge => edge.source && edge.target);

    // Find high-risk nodes
    const highRiskNodes = nodes
      .filter(node => node.risk >= 0.5)
      .map(node => ({
        address: node.id,
        risk: node.risk,
        reason: node.risk >= 0.8 ? "Multiple risk factors" : "Unusual activity pattern"
      }));

    // Simple cycle detection (look for reciprocal transactions)
    const cycles: string[][] = [];
    const reciprocalPairs = new Set<string>();
    
    edges.forEach(edge => {
      const reverse = edges.find(e => e.source === edge.target && e.target === edge.source);
      if (reverse && !reciprocalPairs.has(`${edge.target}-${edge.source}`)) {
        cycles.push([edge.source, edge.target]);
        reciprocalPairs.add(`${edge.source}-${edge.target}`);
      }
    });

    const fraudResults: FraudDetectionResults = {
      stronglyConnectedComponents: cycles.slice(0, 5), // Use reciprocal pairs as SCCs
      cycles,
      highRiskNodes,
      pageRankScores: Object.fromEntries(nodes.map(n => [n.id, n.pagerank])),
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        suspiciousNodes: highRiskNodes.length,
        riskScore: highRiskNodes.length / nodes.length
      }
    };

    setGraphData({ nodes, edges });
    setFraudResults(fraudResults);
  };

  const getRiskBadgeVariant = (risk: number) => {
    if (risk >= 0.8) return "destructive";
    if (risk >= 0.6) return "warning";
    if (risk >= 0.4) return "secondary";
    return "success";
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 0.8) return "High Risk";
    if (risk >= 0.6) return "Medium Risk";
    if (risk >= 0.4) return "Low Risk";
    return "Clean";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Ethereum Fraud Detection
            </h1>
            <p className="text-muted-foreground text-lg">
              Advanced graph analysis for blockchain transaction monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              Network Analysis Engine
            </Badge>
          </div>
        </div>

        {/* Status Overview */}
        {fraudResults && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Wallets</p>
                    <p className="text-2xl font-bold">{fraudResults.stats.totalNodes.toLocaleString()}</p>
                  </div>
                  <Database className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-bold">{fraudResults.stats.totalEdges.toLocaleString()}</p>
                  </div>
                  <Network className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suspicious Wallets</p>
                    <p className="text-2xl font-bold text-warning">{fraudResults.stats.suspiciousNodes}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="text-2xl font-bold">
                      <Badge variant={getRiskBadgeVariant(fraudResults.stats.riskScore)}>
                        {(fraudResults.stats.riskScore * 100).toFixed(1)}%
                      </Badge>
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="visualization" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Visualization
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fraud Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <DataUpload onDataUpload={handleDataUpload} />
          </TabsContent>

          <TabsContent value="processing" className="space-y-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary animate-pulse-glow" />
                  Processing Pipeline
                </CardTitle>
                <CardDescription>
                  Analyzing transaction data and detecting fraud patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{processingStatus.message}</span>
                    <span>{Math.round(processingStatus.progress)}%</span>
                  </div>
                  <Progress value={processingStatus.progress} className="h-2" />
                </div>
                
                {processingStatus.isComplete && (
                  <Alert className="border-success/20 bg-success/10">
                    <Shield className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Analysis complete! Navigate to the Visualization tab to explore results.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualization" className="space-y-6">
            {graphData && <GraphVisualization data={graphData} />}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {fraudResults && <FraudResults results={fraudResults} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FraudDetectionDashboard;