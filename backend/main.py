import json
import os

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json
import os
import requests
from database import get_db, Base, engine
from schemas import (
    ThreadCreate,
    ThreadResponse,
    ThreadListResponse,
    MessageResponse,
    MessageCreate,
)
import crud


app = FastAPI()

# create database tables
Base.metadata.create_all(bind=engine)

# CORS Middleware
origins = ["http://localhost", "http://localhost:3000", "http://localhost:3001"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# thread management endpoints
@app.post("/api/threads", response_model=ThreadResponse)
def create_thread(thread: ThreadCreate, db: Session = Depends(get_db)):
    """Create a new thread"""
    return crud.create_thread(db, thread)


@app.get("/api/threads", response_model=List[ThreadListResponse])
def get_threads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all threads"""
    threads = crud.get_threads(db, skip=skip, limit=limit)
    return [
        ThreadListResponse(
            id=thread.id,
            title=thread.title,
            created_at=thread.created_at,
            updated_at=thread.updated_at,
            message_count=len(thread.messages),
        )
        for thread in threads
    ]


@app.get("/api/threads/{thread_id}", response_model=ThreadResponse)
def get_thread(thread_id: str, db: Session = Depends(get_db)):
    """Get a specific thread with all messages"""
    thread = crud.get_thread(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.put("/api/threads/{thread_id}/title")
def update_thread_title(thread_id: str, request: dict, db: Session = Depends(get_db)):
    """Update thread title"""
    title = request.get("title", "")
    thread = crud.update_thread_title(db, thread_id, title)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"message": "Thread title updated"}


@app.delete("/api/threads/{thread_id}")
def delete_thread(thread_id: str, db: Session = Depends(get_db)):
    """Delete a thread"""
    success = crud.delete_thread(db, thread_id)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"message": "Thread deleted"}


@app.delete("/api/threads")
def delete_all_threads(db: Session = Depends(get_db)):
    """Delete all threads and their messages"""
    deleted_count = crud.delete_all_threads(db)
    return {"message": f"Deleted {deleted_count} threads and all associated messages"}


@app.get("/api/threads/{thread_id}/messages", response_model=List[MessageResponse])
def get_messages(thread_id: str, db: Session = Depends(get_db)):
    """Get all messages for a thread"""
    return crud.get_messages(db, thread_id)


@app.post("/api/chat/message", response_model=MessageResponse)
def save_message(thread_id: str, message: MessageCreate, db: Session = Depends(get_db)):
    """Save a single message to a thread"""
    # verify thread exists
    thread = crud.get_thread(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # save message
    saved_message = crud.create_message(db, message, thread_id)
    return saved_message


@app.post("/api/chat/messages")
def save_messages(
    thread_id: str, messages: List[MessageCreate], db: Session = Depends(get_db)
):
    """Save multiple messages to a thread (batch)"""
    # verify thread exists
    thread = crud.get_thread(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # save all messages
    saved_messages = []
    for message in messages:
        saved_message = crud.create_message(db, message, thread_id)
        saved_messages.append(saved_message)

    return {
        "message": f"Saved {len(saved_messages)} messages",
        "messages": saved_messages,
    }


@app.get("/api/spend")
def get_spend_data(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
):
    """Get spend data from LiteLLM API"""
    try:
        api_key = os.getenv("LITELLM_API_KEY")
        base_url = os.getenv("BASE_URL", "https://litellm.sph-prod.ethz.ch/")

        if not api_key:
            raise HTTPException(
                status_code=500, detail="LITELLM_API_KEY not configured"
            )

        if base_url.endswith("/v1") or base_url.endswith("/v1/"):
            base_url = base_url.replace("/v1/", "/").replace("/v1", "")

        if base_url.endswith("/"):
            base_url = base_url[:-1]

        url = f"{base_url}/user/daily/activity"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        params = {"start_date": start_date, "end_date": end_date}

        response = requests.get(url, headers=headers, params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"LiteLLM API error: {response.text}",
            )

        return response.json()

    except requests.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch spend data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
