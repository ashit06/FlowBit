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
import time

# Vanna AI imports for RAG - Make optional for deployment
try:
    import chromadb
    from sentence_transformers import SentenceTransformer
    import numpy as np
    RAG_AVAILABLE = True
    print("✅ Full RAG dependencies loaded successfully")
except ImportError as e:
    print(f"⚠️ RAG dependencies not available: {e}, falling back to pattern matching mode")
    RAG_AVAILABLE = False
    chromadb = None
    SentenceTransformer = None
    np = None

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vanna AI RAG Service", version="2.0.0")

# CORS configuration for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "https://your-frontend.vercel.app",
        "https://your-backend.vercel.app",
        "https://*.onrender.com",
        "*"  # Remove this in production and specify exact domains
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Configuration with production fallbacks
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://flowbit_dsmj_user:OeBqXReq0cEqRJt4qjGisESU20LjrTNC@dpg-d47npjili9vc738s69lg-a.oregon-postgres.render.com/flowbit_dsmj")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PORT = int(os.getenv("PORT", 8000))

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found, some features may be limited")

# Database connection with retry logic
def create_db_engine():
    try:
        engine = create_engine(DATABASE_URL, echo=False)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connected successfully")
        return engine
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return None

engine = create_db_engine()

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

class RAGVannaAI:
    """Enhanced RAG-based Vanna AI implementation with ChromaDB vector store"""
    
    def __init__(self):
        self.groq_api_key = GROQ_API_KEY
        self.database_url = DATABASE_URL
        self.engine = engine
        self.rag_enabled = False
        self.chroma_client = None
        self.collection = None
        self.embedding_model = None
        
        if RAG_AVAILABLE and chromadb is not None:
            try:
                # Initialize ChromaDB client
                self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
                self.collection_name = "sql_knowledge_base"
                
                # Get or create collection
                try:
                    self.collection = self.chroma_client.get_collection(name=self.collection_name)
                    logger.info("✅ Loaded existing ChromaDB collection")
                except:
                    self.collection = self.chroma_client.create_collection(
                        name=self.collection_name,
                        metadata={"hnsw:space": "cosine"}
                    )
                    logger.info("✅ Created new ChromaDB collection")
                
                # Initialize sentence transformer for embeddings
                if SentenceTransformer is not None:
                    self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                    logger.info("✅ Loaded sentence transformer model")
                else:
                    self.embedding_model = None
                    logger.warning("⚠️ SentenceTransformer not available")
                
                # Initialize knowledge base if empty
                self._initialize_knowledge_base()
                self.rag_enabled = True
                
            except Exception as e:
                logger.error(f"❌ RAG initialization failed: {e}")
                self.rag_enabled = False
        
        if not self.rag_enabled:
            logger.info("📝 Using hybrid mode (pattern matching + Groq)")
    
    def _initialize_knowledge_base(self):
        """Initialize the knowledge base with training data if collection is empty"""
        try:
            collection_count = self.collection.count()
            if collection_count == 0:
                logger.info("🔄 Initializing knowledge base with training data...")
                training_data = self._get_training_data()
                self._add_training_data(training_data)
                logger.info(f"✅ Added {len(training_data)} training examples")
            else:
                logger.info(f"📚 Knowledge base already contains {collection_count} examples")
        except Exception as e:
            logger.error(f"❌ Knowledge base initialization failed: {e}")
    
    def _get_training_data(self):
        """Get comprehensive training data for the RAG system"""
        return [
            {
                "question": "Show me all invoices",
                "sql": "SELECT * FROM invoices ORDER BY \"createdAt\" DESC;",
                "explanation": "Retrieves all invoice records ordered by creation date"
            },
            {
                "question": "What is the total revenue?",
                "sql": "SELECT SUM(\"totalAmount\") as total_revenue FROM invoices;",
                "explanation": "Calculates the sum of all invoice amounts to get total revenue"
            },
            {
                "question": "How many customers do we have?",
                "sql": "SELECT COUNT(*) as customer_count FROM customers;",
                "explanation": "Counts the total number of customers in the database"
            },
            {
                "question": "Show me the top 5 customers by total purchases",
                "sql": """SELECT c.name, c.email, SUM(i.\"totalAmount\") as total_spent 
                         FROM customers c 
                         JOIN invoices i ON c.id = i.\"customerId\" 
                         GROUP BY c.id, c.name, c.email 
                         ORDER BY total_spent DESC 
                         LIMIT 5;""",
                "explanation": "Finds top customers by total purchase amount using joins and aggregation"
            },
            {
                "question": "What are the recent invoices from this week?",
                "sql": "SELECT * FROM invoices WHERE \"issueDate\" >= CURRENT_DATE - INTERVAL '7 days' ORDER BY \"createdAt\" DESC;",
                "explanation": "Filters invoices created within the last 7 days"
            },
            {
                "question": "Show me all vendors",
                "sql": "SELECT * FROM vendors ORDER BY name;",
                "explanation": "Retrieves all vendor information sorted alphabetically by name"
            },
            {
                "question": "Which invoices are overdue?",
                "sql": "SELECT * FROM invoices WHERE \"dueDate\" < CURRENT_DATE AND status != 'PAID' ORDER BY \"dueDate\";",
                "explanation": "Finds invoices past their due date that haven't been paid"
            },
            {
                "question": "Show me invoice details with customer information",
                "sql": """SELECT i.id, i.\"invoiceNumber\", i.\"totalAmount\", i.status, 
                                 c.name as customer_name, c.email 
                         FROM invoices i 
                         JOIN customers c ON i.\"customerId\" = c.id 
                         ORDER BY i.\"createdAt\" DESC;""",
                "explanation": "Joins invoices with customer data to show comprehensive invoice details"
            },
            {
                "question": "What is the average invoice amount?",
                "sql": "SELECT AVG(\"totalAmount\") as average_amount FROM invoices;",
                "explanation": "Calculates the average value of all invoices"
            },
            {
                "question": "Show me invoices by status",
                "sql": "SELECT status, COUNT(*) as count, SUM(\"totalAmount\") as total FROM invoices GROUP BY status;",
                "explanation": "Groups invoices by status showing count and total amount for each status"
            },
            {
                "question": "Show me top vendors by revenue",
                "sql": """SELECT v.name, COUNT(i.id) as invoice_count, SUM(i.\"totalAmount\") as total_revenue 
                         FROM vendors v 
                         LEFT JOIN invoices i ON v.id = i.\"vendorId\" 
                         GROUP BY v.id, v.name 
                         ORDER BY total_revenue DESC 
                         LIMIT 10;""",
                "explanation": "Shows vendors ranked by total revenue generated"
            },
            {
                "question": "What invoices were paid this month?",
                "sql": """SELECT i.\"invoiceNumber\", i.\"totalAmount\", v.name as vendor_name, i.\"issueDate\"
                         FROM invoices i 
                         JOIN vendors v ON i.\"vendorId\" = v.id 
                         WHERE i.status = 'PAID' AND EXTRACT(MONTH FROM i.\"issueDate\") = EXTRACT(MONTH FROM CURRENT_DATE)
                         ORDER BY i.\"issueDate\" DESC;""",
                "explanation": "Lists all paid invoices from the current month"
            }
        ]
    
    def _add_training_data(self, training_data):
        """Add training data to ChromaDB collection"""
        for i, example in enumerate(training_data):
            # Create embedding for the question
            embedding = self.embedding_model.encode(example["question"]).tolist()
            
            # Add to collection
            self.collection.add(
                ids=[f"training_{i}"],
                embeddings=[embedding],
                documents=[example["question"]],
                metadatas=[{
                    "sql": example["sql"],
                    "explanation": example["explanation"],
                    "type": "training_example"
                }]
            )
    
    def _find_similar_questions(self, question: str, top_k: int = 3):
        """Find similar questions from the knowledge base"""
        if not self.rag_enabled or not self.embedding_model or not self.collection:
            return []
            
        try:
            # Create embedding for the input question
            question_embedding = self.embedding_model.encode(question).tolist()
            
            # Query ChromaDB for similar questions
            results = self.collection.query(
                query_embeddings=[question_embedding],
                n_results=top_k
            )
            
            similar_questions = []
            for i, doc in enumerate(results['documents'][0]):
                similarity_score = 1 - results['distances'][0][i] if results['distances'][0] else 0.5
                metadata = results['metadatas'][0][i]
                
                similar_questions.append({
                    "question": doc,
                    "sql": metadata["sql"],
                    "explanation": metadata["explanation"],
                    "similarity": float(similarity_score)
                })
            
            return similar_questions
        
        except Exception as e:
            logger.error(f"❌ Error finding similar questions: {e}")
            return []
    
    def _generate_rag_sql(self, question: str):
        """Generate SQL using RAG approach with similar examples"""
        try:
            # Find similar questions
            similar_questions = self._find_similar_questions(question, top_k=3)
            
            if not similar_questions:
                raise Exception("No similar questions found")
            
            # Use the most similar question as a template
            best_match = similar_questions[0]
            confidence = best_match["similarity"]
            
            if confidence > 0.8:
                # High confidence - use the existing SQL directly
                return {
                    "sql": best_match["sql"],
                    "confidence": confidence,
                    "explanation": f"Found highly similar question. {best_match['explanation']}",
                    "similar_questions": [q["question"] for q in similar_questions]
                }
            elif confidence > 0.5:
                # Medium confidence - use Groq with context
                return self._generate_groq_sql_with_context(question, similar_questions)
            else:
                # Low confidence - fall back to Groq alone
                return self._generate_groq_sql(question)
        
        except Exception as e:
            logger.error(f"❌ RAG SQL generation failed: {e}")
            return self._generate_groq_sql(question)
    
    def _generate_groq_sql_with_context(self, question: str, similar_questions: list):
        """Generate SQL using Groq with RAG context"""
        schema_info = """
        Database Schema:
        - vendors: id, name, email, phone, address, taxId, createdAt, updatedAt
        - customers: id, name, email, phone, address, createdAt, updatedAt  
        - invoices: id, invoiceNumber, vendorId, customerId, issueDate, dueDate, totalAmount, taxAmount, subtotalAmount, currency, status, category, description, createdAt, updatedAt
        - line_items: id, invoiceId, description, quantity, unitPrice, totalPrice, category, createdAt
        - payments: id, invoiceId, amount, paymentDate, method, reference, status, createdAt
        
        Status values: DRAFT, PENDING, SENT, PAID, OVERDUE, CANCELLED
        """
        
        # Build context from similar questions
        context = "Here are some similar questions and their SQL queries for reference:\n"
        for sq in similar_questions[:2]:  # Use top 2
            context += f"Q: {sq['question']}\nSQL: {sq['sql']}\n\n"
        
        prompt = f"""
        Given this database schema:
        {schema_info}
        
        {context}
        
        Generate a PostgreSQL query for: {question}
        
        Return only the SQL query, no explanation.
        """
        
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
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
                sql = sql.replace("```sql", "").replace("```", "").strip()
                
                return {
                    "sql": sql,
                    "confidence": 0.7,  # Medium confidence with context
                    "explanation": f"Generated SQL using similar examples as context",
                    "similar_questions": [q["question"] for q in similar_questions]
                }
            else:
                raise Exception(f"Groq API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Groq with context failed: {e}")
            return self._generate_fallback_sql(question)
    
    def _generate_groq_sql(self, question: str):
        """Generate SQL using Groq API alone"""
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
                    "Authorization": f"Bearer {self.groq_api_key}",
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
                sql = sql.replace("```sql", "").replace("```", "").strip()
                
                return {
                    "sql": sql,
                    "confidence": 0.6,
                    "explanation": "Generated SQL using Groq AI",
                    "similar_questions": []
                }
            else:
                raise Exception(f"Groq API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Groq API failed: {e}")
            return self._generate_fallback_sql(question)
    
    def _generate_fallback_sql(self, question: str):
        """Generate SQL using pattern matching as ultimate fallback"""
        question_lower = question.lower()
        
        # Common query patterns
        if any(word in question_lower for word in ['total revenue', 'revenue', 'total amount', 'total sales']):
            sql = "SELECT SUM(\"totalAmount\") as total_revenue FROM invoices;"
        elif any(word in question_lower for word in ['count invoices', 'number of invoices', 'how many invoices']):
            sql = "SELECT COUNT(*) as invoice_count FROM invoices;"
        elif any(word in question_lower for word in ['vendors', 'suppliers', 'top vendors']):
            sql = """SELECT v.name, COUNT(i.id) as invoice_count, SUM(i.\"totalAmount\") as total_amount 
                     FROM vendors v LEFT JOIN invoices i ON v.id = i.\"vendorId\" 
                     GROUP BY v.id, v.name ORDER BY total_amount DESC LIMIT 10;"""
        elif any(word in question_lower for word in ['customers', 'top customers']):
            sql = """SELECT c.name, COUNT(i.id) as invoice_count, SUM(i.\"totalAmount\") as total_amount 
                     FROM customers c LEFT JOIN invoices i ON c.id = i.\"customerId\" 
                     GROUP BY c.id, c.name ORDER BY total_amount DESC LIMIT 10;"""
        elif any(word in question_lower for word in ['paid invoices', 'paid']):
            sql = "SELECT COUNT(*) as paid_count, SUM(\"totalAmount\") as paid_amount FROM invoices WHERE status = 'PAID';"
        elif any(word in question_lower for word in ['pending invoices', 'pending']):
            sql = "SELECT COUNT(*) as pending_count, SUM(\"totalAmount\") as pending_amount FROM invoices WHERE status = 'PENDING';"
        else:
            sql = "SELECT 'Sorry, I cannot understand this question. Please try asking about total revenue, invoices, vendors, or customers.' as message;"
        
        return {
            "sql": sql,
            "confidence": 0.4,
            "explanation": "Generated using pattern matching (fallback mode)",
            "similar_questions": []
        }
    
    async def query(self, question: str):
        """Main query method that orchestrates the RAG pipeline"""
        start_time = time.time()
        
        try:
            # Generate SQL using RAG if available, otherwise use hybrid approach
            if self.rag_enabled:
                result = self._generate_rag_sql(question)
            else:
                result = self._generate_groq_sql(question)
            
            sql = result["sql"]
            confidence = result["confidence"]
            explanation = result["explanation"]
            similar_questions = result["similar_questions"]
            
            # Execute the SQL query
            with self.engine.connect() as connection:
                db_result = connection.execute(text(sql))
                columns = db_result.keys()
                rows = db_result.fetchall()
                
                # Convert to list of dictionaries
                data = [dict(zip(columns, row)) for row in rows]
            
            execution_time = time.time() - start_time
            
            # Add successful query to knowledge base if RAG is enabled and confidence is high
            if self.rag_enabled and confidence > 0.8:
                try:
                    embedding = self.embedding_model.encode(question).tolist()
                    self.collection.add(
                        ids=[f"user_query_{int(time.time())}"],
                        embeddings=[embedding],
                        documents=[question],
                        metadatas=[{
                            "sql": sql,
                            "explanation": explanation,
                            "type": "user_query",
                            "timestamp": datetime.now().isoformat()
                        }]
                    )
                    logger.info(f"📚 Added successful query to knowledge base")
                except Exception as e:
                    logger.error(f"❌ Failed to add query to knowledge base: {e}")
            
            return {
                "sql": sql,
                "data": data,
                "question": question,
                "confidence": confidence,
                "explanation": explanation,
                "similar_questions": similar_questions,
                "execution_time": execution_time,
                "metadata": {
                    "rag_enabled": self.rag_enabled,
                    "rows_returned": len(data),
                    "method": "RAG" if self.rag_enabled else "Hybrid"
                }
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"❌ Query execution failed: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

# Initialize RAG system
rag_system = RAGVannaAI()

@app.get("/health")
async def health_check():
    """Health check endpoint for production monitoring"""
    db_status = "connected" if engine else "disconnected"
    rag_status = "active" if (rag_system.rag_enabled and rag_system.collection and rag_system.embedding_model) else "inactive"
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "rag_system": rag_status,
        "groq_api": "available" if GROQ_API_KEY else "unavailable",
        "version": "2.0.0",
        "service": "Vanna AI RAG Service"
    }

@app.post("/query", response_model=QueryResponse)
async def query_data(request: QueryRequest):
    return await rag_system.query(request.question)

@app.get("/")
async def root():
    return {
        "service": "Vanna AI RAG Service",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "query": "/query (POST)",
            "docs": "/docs"
        }
    }

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,  # Disable in production
        log_level="info"
    )