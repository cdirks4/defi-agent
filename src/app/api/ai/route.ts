import { NextRequest, NextResponse } from "next/server";
import { LlamaService } from "@/services/llama";

const llama = new LlamaService({
  endpoint: process.env.LLAMA_API_ENDPOINT!,
  apiKey: process.env.LLAMA_API_KEY,
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log("AI request started:", new Date().toISOString());
  
  try {
    const { systemPrompt, userMessage, context } = await req.json();

    if (!systemPrompt || !userMessage) {
      console.error("Missing parameters:", {
        systemPrompt: !!systemPrompt,
        userMessage: !!userMessage,
      });
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Calling Llama service with:", {
      promptLength: systemPrompt.length,
      messageLength: userMessage.length,
      hasContext: !!context,
    });

    const response = await llama.generateResponse({
      systemPrompt,
      userMessage,
      context: context || {},
    });

    try {
      JSON.parse(response);
      console.log(
        "Successfully parsed AI response in",
        Date.now() - startTime,
        "ms"
      );
    } catch (error) {
      console.error("JSON parsing error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        response: response.slice(0, 200) + "...", // Log first 200 chars of response
        timeElapsed: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: "AI generated invalid JSON response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI processing error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timeElapsed: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
