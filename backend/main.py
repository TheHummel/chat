from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json
from database import get_db, Base, engine
from models import Thread, Message
from schemas import (
    ThreadCreate,
    ThreadResponse,
    ThreadListResponse,
    MessageCreate,
    MessageResponse,
    ChatRequest,
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


@app.post("/api/chat")
async def chat_endpoint(request_body: ChatRequest, db: Session = Depends(get_db)):
    if not request_body.messages:
        return {"text": "No message received."}

    thread_id = request_body.thread_id
    model_provider = request_body.model_provider or "openai"

    if not thread_id:
        new_thread = crud.create_thread(db, ThreadCreate())
        thread_id = new_thread.id
    else:
        existing_thread = crud.get_thread(db, thread_id)
        if not existing_thread:
            new_thread = crud.create_thread(db, ThreadCreate())
            thread_id = new_thread.id

    user_message = request_body.messages[-1]
    crud.create_message(db, MessageCreate(**user_message.dict()), thread_id)

    from pipeline import chat_pipeline

    async def stream_generator():
        try:
            async for chunk in chat_pipeline.stream_response(
                request_body.messages, db, thread_id, model_provider
            ):
                data = json.dumps({"text": chunk, "thread_id": thread_id})
                yield f"data: {data}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e), "thread_id": thread_id})
            yield f"data: {error_data}\n\n"
        finally:
            # send done
            yield f"data: {json.dumps({'done': True, 'thread_id': thread_id})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/models")
def get_available_models():
    """Get list of available model providers"""
    return {
        "models": [
            {"id": "openai", "name": "OpenAI GPT-4", "provider": "OpenAI"},
            {"id": "anthropic", "name": "Claude 3 Sonnet", "provider": "Anthropic"},
            {"id": "gemini", "name": "Gemini Pro", "provider": "Google"},
        ]
    }


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


@app.get("/api/threads/{thread_id}/messages", response_model=List[MessageResponse])
def get_messages(thread_id: str, db: Session = Depends(get_db)):
    """Get all messages for a thread"""
    return crud.get_messages(db, thread_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
