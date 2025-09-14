import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  TrendingUp, 
  Network, 
  RefreshCw, 
  Download, 
  Copy,
  Eye,
  Shield,
  Users,
  Activity
} from "lucide-react";

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

interface FraudResultsProps {
  results: FraudDetectionResults;
}

const FraudResults: React.FC<FraudResultsProps> = ({ results }) => {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  const getRiskBadgeVariant = (risk: number) => {
    if (risk >= 0.8) return "destructive";
    if (risk >= 0.6) return "warning";
    if (risk >= 0.4) return "secondary";
    return "default";
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 0.8) return "Critical";
    if (risk >= 0.6) return "High";
    if (risk >= 0.4) return "Medium";
    return "Low";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      analysis: results,
      summary: {
        totalNodes: results.stats.totalNodes,
        totalEdges: results.stats.totalEdges,
        suspiciousNodes: results.stats.suspiciousNodes,
        overallRiskScore: results.stats.riskScore
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fraud-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      <Alert className={`border-${results.stats.riskScore >= 0.7 ? 'destructive' : results.stats.riskScore >= 0.4 ? 'warning' : 'success'}/20 bg-${results.stats.riskScore >= 0.7 ? 'destructive' : results.stats.riskScore >= 0.4 ? 'warning' : 'success'}/10`}>
        <Shield className={`h-4 w-4 text-${results.stats.riskScore >= 0.7 ? 'destructive' : results.stats.riskScore >= 0.4 ? 'warning' : 'success'}`} />
        <AlertDescription className={`text-${results.stats.riskScore >= 0.7 ? 'destructive' : results.stats.riskScore >= 0.4 ? 'warning' : 'success'}`}>
          <strong>Analysis Complete:</strong> Found {results.stats.suspiciousNodes} suspicious wallets 
          with an overall network risk score of {(results.stats.riskScore * 100).toFixed(1)}%.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button onClick={exportResults} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Re-analyze
        </Button>
      </div>

      <Tabs defaultValue="high-risk" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
          <TabsTrigger value="high-risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High Risk Wallets
          </TabsTrigger>
          <TabsTrigger value="scc" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Connected Components
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Detected Cycles
          </TabsTrigger>
          <TabsTrigger value="pagerank" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Influence Ranking
          </TabsTrigger>
        </TabsList>

        {/* High Risk Wallets */}
        <TabsContent value="high-risk" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  High Risk Wallets
                </span>
                <Badge variant="destructive">
                  {results.highRiskNodes.length} found
                </Badge>
              </CardTitle>
              <CardDescription>
                Wallets flagged by multiple fraud detection algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {results.highRiskNodes.map((node, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {formatAddress(node.address)}
                          </code>
                          <Badge variant={getRiskBadgeVariant(node.risk)}>
                            {getRiskLabel(node.risk)} ({(node.risk * 100).toFixed(1)}%)
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{node.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(node.address)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAddress(node.address)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strongly Connected Components */}
        <TabsContent value="scc" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-warning" />
                  Strongly Connected Components
                </span>
                <Badge variant="warning">
                  {results.stronglyConnectedComponents.length} groups
                </Badge>
              </CardTitle>
              <CardDescription>
                Groups of wallets with circular transaction patterns (potential scam rings)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {results.stronglyConnectedComponents.map((component, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Component {index + 1}</h4>
                        <Badge variant="secondary">{component.length} wallets</Badge>
                      </div>
                      <div className="space-y-2">
                        {component.map((address, addrIndex) => (
                          <div key={addrIndex} className="flex items-center justify-between">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {formatAddress(address)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cycles */}
        <TabsContent value="cycles" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-accent" />
                  Transaction Cycles
                </span>
                <Badge variant="secondary">
                  {results.cycles.length} cycles
                </Badge>
              </CardTitle>
              <CardDescription>
                Circular transaction patterns indicating potential wash trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {results.cycles.map((cycle, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Cycle {index + 1}</h4>
                        <Badge variant="secondary">{cycle.length} hops</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {cycle.map((address, addrIndex) => (
                          <React.Fragment key={addrIndex}>
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {formatAddress(address)}
                            </code>
                            {addrIndex < cycle.length - 1 && (
                              <span className="text-muted-foreground">→</span>
                            )}
                          </React.Fragment>
                        ))}
                        <span className="text-muted-foreground">↻</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PageRank */}
        <TabsContent value="pagerank" className="space-y-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Influence Ranking (PageRank)
                </span>
                <Badge variant="secondary">
                  Top 20 influential wallets
                </Badge>
              </CardTitle>
              <CardDescription>
                Most influential wallets based on transaction volume and network centrality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {Object.entries(results.pageRankScores)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 20)
                    .map(([address, score], index) => (
                      <div 
                        key={address}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {formatAddress(address)}
                          </code>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{(score * 1000).toFixed(3)}</p>
                            <p className="text-xs text-muted-foreground">PageRank Score</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FraudResults;