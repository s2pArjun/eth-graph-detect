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

    // Generate mock results
    generateMockResults();
    setActiveTab("visualization");
  };

  const generateMockResults = () => {
    // Generate mock graph data
    const mockGraphData: GraphData = {
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `0x${Math.random().toString(16).substr(2, 40)}`,
        label: `Wallet ${i + 1}`,
        risk: Math.random(),
        pagerank: Math.random() * 0.01
      })),
      edges: Array.from({ length: 200 }, (_, i) => ({
        source: `0x${Math.random().toString(16).substr(2, 40)}`,
        target: `0x${Math.random().toString(16).substr(2, 40)}`,
        value: Math.random() * 1000,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
      }))
    };

    // Generate mock fraud results
    const mockFraudResults: FraudDetectionResults = {
      stronglyConnectedComponents: [
        [`0x${Math.random().toString(16).substr(2, 40)}`, `0x${Math.random().toString(16).substr(2, 40)}`],
        [`0x${Math.random().toString(16).substr(2, 40)}`, `0x${Math.random().toString(16).substr(2, 40)}`]
      ],
      cycles: [
        [`0x${Math.random().toString(16).substr(2, 40)}`, `0x${Math.random().toString(16).substr(2, 40)}`]
      ],
      highRiskNodes: Array.from({ length: 10 }, (_, i) => ({
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        risk: 0.7 + Math.random() * 0.3,
        reason: ["High out-degree", "Part of SCC", "Unusual transaction pattern"][Math.floor(Math.random() * 3)]
      })),
      pageRankScores: {},
      stats: {
        totalNodes: 100,
        totalEdges: 200,
        suspiciousNodes: 15,
        riskScore: 0.68
      }
    };

    setGraphData(mockGraphData);
    setFraudResults(mockFraudResults);
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