from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import json
import requests

load_dotenv()

app = FastAPI(title="Vanna AI Service", version="1.0.0")

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
    question: str
    sql: str
    results: list
    explanation: str

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "Vanna AI"}

def generate_sql_with_groq(question: str) -> str:
    """Generate SQL using Groq API"""
    
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
        return ""

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