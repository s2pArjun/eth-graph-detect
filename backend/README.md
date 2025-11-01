# GCN Fraud Detection Backend

This Python backend processes graph data and runs Graph Convolutional Network (GCN) analysis for fraud detection.

## Setup

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Start the backend server:**
```bash
python gcn_processor.py
```

The server will run on `http://localhost:5000`

## API Endpoint

### POST /api/run-gcn

Accepts GCN graph data and returns fraud predictions.

**Request Body:**
```json
{
  "nodes": [...],
  "edges": [...],
  "metadata": {
    "risk_threshold": 0.6234
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "summary": {
    "totalNodes": 150,
    "fraudPredicted": 25,
    "cleanPredicted": 125,
    "labeledFraud": 12,
    "labeledClean": 8
  }
}
```

## Features

- **Hybrid Labeling:** Combines manual labels with threshold-based automatic labeling
- **GCN Training:** 3-layer Graph Convolutional Network with dropout
- **Fraud Prediction:** Returns probability scores for each node
- **CORS Enabled:** Can be called from frontend on different port

## Customization

Edit `manual_fraud` set in `apply_hybrid_labeling()` to add known fraud addresses.
