from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="WhatsApp Multi-User CRM", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "WhatsApp CRM API is running"}
