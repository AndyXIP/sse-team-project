from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import boto3
import os
import uuid
import json
from dotenv import load_dotenv
from typing import List, Optional
import asyncio
from glide import (
    GlideClient,
    GlideClientConfiguration,
    NodeAddress,
    TimeoutError,
    RequestError,
    ConnectionError,
    ClosingError,
    Logger,
    LogLevel
)

load_dotenv()

app = FastAPI()
valkey_client = None

sqs = boto3.client('sqs', region_name=os.getenv('AWS_REGION', 'eu-north-1'))
SQS_QUEUE_URL = os.getenv('SQS_QUEUE_URL')

class SubmitCodePayload(BaseModel):
    code: str
    problem_id: str
    language: str

class DailyQuestion(BaseModel):
    problem_id: str
    description: str
    test_cases: list

@app.get("/")
def index():
    return {"message": "Welcome to the Main API!"}

@app.on_event("startup")
async def startup_event():
    """
    Initializes the Valkey client once, when the FastAPI app starts.
    """
    global valkey_client
    Logger.set_logger_config(LogLevel.INFO)

    addresses = [
        NodeAddress("main-cache-mutbnm.serverless.eun1.cache.amazonaws.com", 6379)
    ]
    config = GlideClientConfiguration(addresses=addresses, use_tls=True)
    try:
        valkey_client = await GlideClient.create(config)
        print("Valkey client created successfully.")
    except Exception as e:
        print("Failed to create Valkey client:", e)
        raise e


@app.on_event("shutdown")
async def shutdown_event():
    """
    Gracefully close the Valkey client on shutdown.
    """
    global valkey_client
    if valkey_client:
        try:
            await valkey_client.close()
            print("Valkey client closed successfully.")
        except ClosingError as e:
            print("Error closing Valkey client:", e)



# ==== API Routes ====

@app.get("/api/daily-question")
async def daily_qustion(difficulty: str = 'easy'):
    # # Temporary fake data:
    # return {
    #     'description': 'Define a function which adds 10 to the inputted integer and returns the result.',
    #     'problem_id': '123',
    #     'test_cases': [[-10], [10], [7]]
    # }
    """
    Check Valkey cache: if miss, get new set of questions from Questions API
    and store in cache, and use #1; otherwise use today's Q from cache

    Return the Q as json to frontend
    """
    global valkey_client
    if not valkey_client:
        raise HTTPException(status_code=500, detail="Valkey client not initialized")

    key = "daily_question"
    try:
        cached_value = await valkey_client.get(key)
        if cached_value:
            # Convert string back to JSON
            daily_q = json.loads(cached_value)
            return daily_q
        else:
            # If cache miss, store a default daily question
            default_question = {
                "problem_id": "123",
                "description": "Define a function which adds 10 to the inputted integer and returns the result.",
                "test_cases": [[-10], [10], [7]]
            }

            await valkey_client.set(key, json.dumps(default_question))
            # Optionally set a TTL (e.g., 24 hours = 86400 seconds)
            # await valkey_client.expire(key, 86400)

            return default_question
        
    except (TimeoutError, RequestError, ConnectionError, ClosingError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/submit-code")
def submit_code(payload: SubmitCodePayload):
    job_id = str(uuid.uuid4())

    job_payload = {
        'job_id': job_id,
        'problem_id': payload.problem_id,
        'language': payload.language,
        'code': payload.code,
        'status': 'queued',
    }

    try:
        response = sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(job_payload),
            MessageGroupId='default'
        )
        return {
            "message_id": response.get('MessageId'), 
            "status": "queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

