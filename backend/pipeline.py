import os
from typing import List, AsyncGenerator
from sqlalchemy.orm import Session
import openai
from schemas import MessageCreate, ContentItem
import crud


class ChatPipeline:
    def __init__(self):
        # init API client with LiteLLM endpoint
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv("LITELLM_API_KEY"), base_url=os.getenv("BASE_URL")
        )

    async def stream_response(
        self,
        messages: List[MessageCreate],
        db: Session,
        thread_id: str,
        model_id: str = "gpt-4o",
    ) -> AsyncGenerator[str, None]:
        """Stream response from the specified model via LiteLLM"""

        model = model_id

        chat_messages = []
        for msg in messages:
            content = "".join(item.text for item in msg.content if item.type == "text")
            chat_messages.append({"role": msg.role, "content": content})

        # stream response
        full_response = ""
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=chat_messages,
                stream=True,
                temperature=0.7,
                max_tokens=2000,
            )

            async for chunk in stream:
                if (
                    chunk.choices
                    and len(chunk.choices) > 0
                    and chunk.choices[0].delta
                    and chunk.choices[0].delta.content
                ):
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content

        except Exception as e:
            error_msg = f"Error with {model}: {str(e)}"
            print(f"Pipeline error: {error_msg}")
            yield error_msg
            full_response = error_msg

        # save assistant response to database
        if full_response and not full_response.startswith("Error"):
            try:
                assistant_message = MessageCreate(
                    role="assistant",
                    content=[ContentItem(type="text", text=full_response)],
                )
                crud.create_message(db, assistant_message, thread_id)

                # auto-generate title from first user message if thread doesn't have one
                thread = crud.get_thread(db, thread_id)
                if thread and (not thread.title or thread.title == "New Chat"):
                    all_messages = crud.get_messages(db, thread_id)
                    first_user_message = next(
                        (msg for msg in all_messages if msg.role == "user"), None
                    )
                    if first_user_message:
                        if isinstance(first_user_message.content, list):
                            content = "".join(
                                item.get("text", "")
                                for item in first_user_message.content
                                if item.get("type") == "text"
                            )
                        else:
                            content = str(first_user_message.content)
                        auto_title = content.strip()[:50]
                        if len(content) > 50:
                            auto_title += "..."
                        if auto_title:
                            crud.update_thread_title(db, thread_id, auto_title)

            except Exception as e:
                print(f"Database save error: {e}")


chat_pipeline = ChatPipeline()
