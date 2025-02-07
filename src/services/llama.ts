import { Groq } from "groq-sdk";

interface LlamaServiceConfig {
  endpoint: string;
  apiKey?: string;
}

export class LlamaService {
  private groq: Groq;

  constructor(config: LlamaServiceConfig) {
    if (typeof window !== "undefined") {
      throw new Error(
        "LlamaService can only be instantiated on the server side"
      );
    }

    const apiKey = config.apiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("Server-side GROQ_API_KEY is required");
    }

    this.groq = new Groq({
      apiKey: apiKey,
    });
  }

  async generateResponse({
    systemPrompt,
    userMessage,
    context = {},
  }: {
    systemPrompt: string;
    userMessage: string;
    context?: Record<string, any>;
  }) {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        model: "mixtral-8x7b-32768",
        temperature: 0.5,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("GROQ API error:", error);
      throw new Error("Failed to generate response");
    }
  }
}
