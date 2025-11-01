# backend/gcn_processor.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data
import numpy as np

app = Flask(__name__)
CORS(app)

# ============================================
# GCN Model (Same as your Colab)
# ============================================
class FraudDetectionGCN(torch.nn.Module):
    def __init__(self, num_features, hidden_channels):
        super(FraudDetectionGCN, self).__init__()
        self.conv1 = GCNConv(num_features, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, hidden_channels)
        self.conv3 = GCNConv(hidden_channels, 2)
    
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        
        x = self.conv3(x, edge_index)
        return F.log_softmax(x, dim=1)

# ============================================
# API Endpoint
# ============================================
@app.route('/api/run-gcn', methods=['POST'])
def run_gcn():
    try:
        # Get JSON from frontend
        graph_data = request.json
        threshold = graph_data['metadata']['risk_threshold']
        
        print(f"📊 Received graph: {len(graph_data['nodes'])} nodes")
        
        # Apply hybrid labeling
        fraud_nodes, clean_nodes, unknown_nodes = apply_hybrid_labeling(
            graph_data, threshold
        )
        
        print(f"🏷️  Labels: {len(fraud_nodes)} fraud, {len(clean_nodes)} clean")
        
        # Prepare PyTorch data
        data, node_id_map = prepare_pyg_data(
            graph_data, fraud_nodes, clean_nodes
        )
        
        # Train GCN
        model = FraudDetectionGCN(num_features=6, hidden_channels=16)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
        
        print("🚀 Training GCN...")
        for epoch in range(100):
            loss = train_step(model, data, optimizer)
            if epoch % 20 == 0:
                print(f"   Epoch {epoch}: {loss:.4f}")
        
        # Make predictions
        model.eval()
        with torch.no_grad():
            out = model(data.x, data.edge_index)
            fraud_probs = torch.exp(out)[:, 1].numpy()
        
        # Format results
        results = []
        for i, node in enumerate(graph_data['nodes']):
            results.append({
                'address': node['id'],
                'microScore': node['features']['micro_score'],
                'gcnProbability': float(fraud_probs[i]),
                'prediction': 'FRAUD' if fraud_probs[i] > 0.5 else 'CLEAN',
                'label': get_node_label(node['id'], fraud_nodes, clean_nodes)
            })
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'totalNodes': len(results),
                'fraudPredicted': sum(1 for r in results if r['prediction'] == 'FRAUD'),
                'cleanPredicted': sum(1 for r in results if r['prediction'] == 'CLEAN'),
                'labeledFraud': len(fraud_nodes),
                'labeledClean': len(clean_nodes),
                'unknown': len(unknown_nodes)
            }
        })
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# Helper Functions
# ============================================
def apply_hybrid_labeling(graph_data, threshold):
    # Manual fraud addresses (you can customize this)
    manual_fraud = {
        'BinanceWallet',
        # Add more known fraud addresses
    }
    manual_clean = set()
    
    FRAUD_THRESHOLD_HIGH = threshold * 1.6
    CLEAN_THRESHOLD_LOW = threshold * 0.8
    
    threshold_fraud = set()
    threshold_clean = set()
    
    for node in graph_data['nodes']:
        node_id = node['id']
        micro_score = node['features']['micro_score']
        degree = node['features']['degree']
        
        if node_id in manual_fraud or node_id in manual_clean:
            continue
        
        if micro_score >= FRAUD_THRESHOLD_HIGH:
            threshold_fraud.add(node_id)
        elif micro_score <= CLEAN_THRESHOLD_LOW and degree <= 2:
            threshold_clean.add(node_id)
    
    fraud_nodes = list(manual_fraud.union(threshold_fraud))
    clean_nodes = list(manual_clean.union(threshold_clean))
    unknown_nodes = [n['id'] for n in graph_data['nodes'] 
                     if n['id'] not in fraud_nodes and n['id'] not in clean_nodes]
    
    return fraud_nodes, clean_nodes, unknown_nodes

def prepare_pyg_data(graph_data, fraud_nodes, clean_nodes):
    node_id_map = {}
    node_features = []
    node_labels = []
    train_mask = []
    
    for i, node in enumerate(graph_data['nodes']):
        node_id_map[node['id']] = i
        
        features = [
            node['features']['degree'],
            node['features']['in_degree'],
            node['features']['out_degree'],
            node['features']['pagerank'],
            node['features']['tx_entropy'],
            node['features']['micro_score']
        ]
        node_features.append(features)
        
        if node['id'] in fraud_nodes:
            node_labels.append(1)
            train_mask.append(True)
        elif node['id'] in clean_nodes:
            node_labels.append(0)
            train_mask.append(True)
        else:
            node_labels.append(0)
            train_mask.append(False)
    
    x = torch.tensor(node_features, dtype=torch.float)
    y = torch.tensor(node_labels, dtype=torch.long)
    train_mask = torch.tensor(train_mask, dtype=torch.bool)
    
    edge_list = []
    for edge in graph_data['edges']:
        if edge['source'] in node_id_map and edge['target'] in node_id_map:
            src = node_id_map[edge['source']]
            tgt = node_id_map[edge['target']]
            edge_list.append([src, tgt])
    
    edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
    
    data = Data(x=x, edge_index=edge_index, y=y, train_mask=train_mask)
    return data, node_id_map

def train_step(model, data, optimizer):
    model.train()
    optimizer.zero_grad()
    out = model(data.x, data.edge_index)
    loss = F.nll_loss(out[data.train_mask], data.y[data.train_mask])
    loss.backward()
    optimizer.step()
    return loss.item()

def get_node_label(node_id, fraud_nodes, clean_nodes):
    if node_id in fraud_nodes:
        return 'FRAUD_LABELED'
    elif node_id in clean_nodes:
        return 'CLEAN_LABELED'
    return 'UNKNOWN'

if __name__ == '__main__':
    print("🚀 Starting GCN Processor Backend on http://localhost:5000")
    print("📋 Required packages: flask, flask-cors, torch, torch-geometric")
    app.run(host='0.0.0.0', port=5000, debug=True)
