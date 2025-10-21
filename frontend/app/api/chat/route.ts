import { mistral } from "@ai-sdk/mistral";
import { streamText } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, model: modelId } = await req.json();


    const result = streamText({
      model: mistral(modelId),
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Route error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
