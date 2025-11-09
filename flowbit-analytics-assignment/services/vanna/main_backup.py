from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import json
import requests
import pandas as pd
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import logging

# Vanna AI imports for RAG
try:
    import vanna
    from vanna.chromadb_vector import ChromaDB_VectorStore
    from vanna.base import VannaBase
    import chromadb
    from sentence_transformers import SentenceTransformer
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    RAG_AVAILABLE = True
    print("✅ Full RAG dependencies loaded successfully")
except ImportError as e:
    print(f"⚠️ RAG dependencies not available: {e}, falling back to hybrid mode")
    RAG_AVAILABLE = False

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vanna AI RAG Service", version="2.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://user:password@localhost:5433/flowbit_analytics")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

# Database connection
try:
    engine = create_engine(DATABASE_URL)
    print(f"✅ Connected to database: {DATABASE_URL}")
except Exception as e:
    print(f"❌ Database connection error: {e}")

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    sql: str
    data: List[Dict[str, Any]]
    question: str
    confidence: float
    explanation: str
    similar_questions: List[str]
    execution_time: float
    metadata: Dict[str, Any]
    
class QueryResponse(BaseModel):
    question: str
    sql: str
    results: list
    explanation: str

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "Vanna AI"}

def generate_sql_with_fallback(question: str) -> str:
    """Generate SQL using pattern matching as fallback"""
    question_lower = question.lower()
    
    # Common query patterns
    if any(word in question_lower for word in ['total revenue', 'revenue', 'total amount', 'total sales', 'sales total', 'total spend', 'spend total']):
        return "SELECT SUM(\"totalAmount\") as total_revenue FROM invoices;"
    elif any(word in question_lower for word in ['count invoices', 'number of invoices', 'how many invoices']):
        return "SELECT COUNT(*) as invoice_count FROM invoices;"
    elif any(word in question_lower for word in ['vendors', 'suppliers', 'top vendors']):
        return "SELECT name, COUNT(i.id) as invoice_count, SUM(i.\"totalAmount\") as total_amount FROM vendors v LEFT JOIN invoices i ON v.id = i.\"vendorId\" GROUP BY v.id, v.name ORDER BY total_amount DESC LIMIT 10;"
    elif any(word in question_lower for word in ['customers', 'top customers']):
        return "SELECT name, COUNT(i.id) as invoice_count, SUM(i.\"totalAmount\") as total_amount FROM customers c LEFT JOIN invoices i ON c.id = i.\"customerId\" GROUP BY c.id, c.name ORDER BY total_amount DESC LIMIT 10;"
    elif any(word in question_lower for word in ['paid invoices', 'paid']):
        return "SELECT COUNT(*) as paid_count, SUM(\"totalAmount\") as paid_amount FROM invoices WHERE status = 'PAID';"
    elif any(word in question_lower for word in ['pending invoices', 'pending']):
        return "SELECT COUNT(*) as pending_count, SUM(\"totalAmount\") as pending_amount FROM invoices WHERE status = 'PENDING';"
    elif any(word in question_lower for word in ['overdue invoices', 'overdue']):
        return "SELECT COUNT(*) as overdue_count, SUM(\"totalAmount\") as overdue_amount FROM invoices WHERE status = 'OVERDUE';"
    elif any(word in question_lower for word in ['jan', 'january', 'month']):
        return "SELECT EXTRACT(MONTH FROM \"issueDate\") as month, COUNT(*) as invoice_count, SUM(\"totalAmount\") as total_amount FROM invoices WHERE EXTRACT(MONTH FROM \"issueDate\") = 1 GROUP BY EXTRACT(MONTH FROM \"issueDate\");"
    elif any(word in question_lower for word in ['sales by month', 'monthly sales', 'revenue by month']):
        return "SELECT EXTRACT(MONTH FROM \"issueDate\") as month, COUNT(*) as invoice_count, SUM(\"totalAmount\") as total_amount FROM invoices GROUP BY EXTRACT(MONTH FROM \"issueDate\") ORDER BY month;"
    elif 'average' in question_lower and ('invoice' in question_lower or 'amount' in question_lower):
        return "SELECT AVG(\"totalAmount\") as average_invoice_value FROM invoices;"
    elif any(word in question_lower for word in ['highest invoice', 'largest invoice', 'biggest invoice']):
        return "SELECT v.name as vendor, \"invoiceNumber\", \"totalAmount\" FROM invoices i JOIN vendors v ON i.\"vendorId\" = v.id ORDER BY \"totalAmount\" DESC LIMIT 1;"
    elif 'last' in question_lower and ('days' in question_lower or 'week' in question_lower or 'month' in question_lower):
        return "SELECT COUNT(*) as recent_invoices, SUM(\"totalAmount\") as recent_total FROM invoices WHERE \"issueDate\" >= CURRENT_DATE - INTERVAL '30 days';"
    else:
        return "SELECT 'Sorry, I cannot understand this question. Try asking about total revenue, invoices, vendors, customers, monthly sales, or average invoice value.' as message;"

def generate_sql_with_groq(question: str) -> str:
    """Generate SQL using Groq API with fallback"""
    
    # First try the fallback for common questions
    fallback_sql = generate_sql_with_fallback(question)
    if "Sorry, I cannot understand" not in fallback_sql:
        return fallback_sql
    
    schema_info = """
    Database Schema:
    - vendors: id, name, email, phone, address, taxId, createdAt, updatedAt
    - customers: id, name, email, phone, address, createdAt, updatedAt  
    - invoices: id, invoiceNumber, vendorId, customerId, issueDate, dueDate, totalAmount, taxAmount, subtotalAmount, currency, status, category, description, createdAt, updatedAt
    - line_items: id, invoiceId, description, quantity, unitPrice, totalPrice, category, createdAt
    - payments: id, invoiceId, amount, paymentDate, method, reference, status, createdAt
    
    Status values: DRAFT, PENDING, SENT, PAID, OVERDUE, CANCELLED
    """
    
    prompt = f"""
    Given this database schema:
    {schema_info}
    
    Generate a PostgreSQL query for: {question}
    
    Return only the SQL query, no explanation.
    """
    
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3-8b-8192",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            sql = result["choices"][0]["message"]["content"].strip()
            # Clean up the SQL (remove markdown formatting if present)
            sql = sql.replace("```sql", "").replace("```", "").strip()
            return sql
        else:
            raise Exception(f"Groq API error: {response.status_code}")
            
    except Exception as e:
        print(f"Error generating SQL: {e}")
        # Fall back to pattern matching
        return generate_sql_with_fallback(question)

@app.post("/query", response_model=QueryResponse)
async def query_data(request: QueryRequest):
    try:
        # Generate SQL from natural language using Groq
        sql = generate_sql_with_groq(request.question)
        
        if not sql:
            raise HTTPException(status_code=400, detail="Could not generate SQL from the question")
        
        # Execute the SQL query
        with engine.connect() as connection:
            result = connection.execute(text(sql))
            columns = result.keys()
            rows = result.fetchall()
            
            # Convert to list of dictionaries
            results_list = [dict(zip(columns, row)) for row in rows]
        
        return QueryResponse(
            question=request.question,
            sql=sql,
            results=results_list,
            explanation=f"Generated SQL query to answer: {request.question}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Vanna AI Service for Flowbit Analytics"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))