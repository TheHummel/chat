import json
import os

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
    model_id = request_body.model_provider or "gpt-4o"  # fallback to default model

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
                request_body.messages, db, thread_id, model_id
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
    """Get list of available model providers and models"""
    # load models from JSON file
    try:
        models_file = os.path.join(os.path.dirname(__file__), "available_models.json")
        with open(models_file, "r") as f:
            models_data = json.load(f)

        # group models by provider
        providers = {}

        for model in models_data["data"]:
            model_id = model["id"]

            if model_id.startswith("openai/") or model_id in [
                "gpt-4o-mini",
                "gpt-o1",
                "gpt-4o",
                "gpt-3.5",
                "gpt-o1-mini",
                "dall-e-3",
            ]:
                provider = "openai"
                display_name = (
                    model_id.replace("openai/", "") if "/" in model_id else model_id
                )
            elif model_id.startswith("gemini/"):
                provider = "gemini"
                display_name = model_id.replace("gemini/", "")
            elif model_id.startswith("groq/"):
                provider = "groq"
                display_name = model_id.replace("groq/", "")
            elif model_id.startswith("azure/"):
                provider = "azure"
                display_name = model_id.replace("azure/", "")
            elif model_id.startswith("azure_ai/"):
                provider = "azure_ai"
                display_name = model_id.replace("azure_ai/", "")
            else:
                if "llama" in model_id.lower():
                    provider = "ollama"
                    display_name = model_id
                elif "mistral" in model_id.lower():
                    provider = "ollama"
                    display_name = model_id
                else:
                    provider = "other"
                    display_name = model_id

            # skip image generation, TTS, and embedding models for now
            if any(
                skip_term in model_id.lower()
                for skip_term in [
                    "dall-e",
                    "whisper",
                    "tts",
                    "embedding",
                    "moderation",
                    "transcribe",
                    "gpt-image",
                    "playai-tts",
                    "distil-whisper",
                ]
            ):
                continue

            if provider not in providers:
                providers[provider] = []

            providers[provider].append(
                {"id": model_id, "name": display_name, "full_name": model_id}
            )

        # sort models within each provider
        for provider in providers:
            providers[provider].sort(key=lambda x: x["name"])

        return {
            "providers": providers,
            "default_models": {
                "openai": "gpt-4o",
                "gemini": "gemini/gemini-2.5-flash",
                "groq": "groq/llama-3.1-70b-versatile",
                "azure": "azure/gpt-4o",
                "azure_ai": "azure_ai/cohere-rerank-v3.5",
                "ollama": "llama3.1:8b",
                "other": None,
            },
        }

    except Exception as e:
        print(f"Error loading models: {e}")
        # fallback
        return {
            "providers": {
                "openai": [
                    {"id": "gpt-4o", "name": "GPT-4o", "full_name": "gpt-4o"},
                    {
                        "id": "gpt-4o-mini",
                        "name": "GPT-4o Mini",
                        "full_name": "gpt-4o-mini",
                    },
                ],
                "gemini": [
                    {
                        "id": "gemini/gemini-2.5-flash",
                        "name": "Gemini 2.5 Flash",
                        "full_name": "gemini/gemini-2.5-flash",
                    },
                ],
                "groq": [
                    {
                        "id": "groq/llama-3.1-70b-versatile",
                        "name": "Llama 3.1 70B",
                        "full_name": "groq/llama-3.1-70b-versatile",
                    },
                ],
            },
            "default_models": {
                "openai": "gpt-4o",
                "gemini": "gemini/gemini-2.5-flash",
                "groq": "groq/llama-3.1-70b-versatile",
            },
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
