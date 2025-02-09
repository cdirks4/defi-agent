import { LlamaService } from "./llama";
import { agentKit } from "./agentkit";
import { dbService } from "./db";

export class AssistantService {
  private llama: LlamaService;

  constructor() {
    this.llama = new LlamaService({
      endpoint: process.env.LLAMA_API_ENDPOINT!,
      apiKey: process.env.LLAMA_API_KEY,
    });
  }

  async processUserMessage(userId: string, message: string) {
    // Get user context
    const walletState = await agentKit.checkWalletHealth();
    const userHistory = await dbService.getUserHistory(userId);
    const tradeHistory = await dbService.getTradeHistory(userId);

    // Get Llama response
    const stream = await this.llama.generateResponse({
      systemPrompt:
        "You are a helpful AI assistant focused on cryptocurrency trading and wallet management. Provide accurate and helpful information while maintaining user privacy and security.",
      userMessage: message,
      context: {
        walletState,
        userHistory,
        tradeHistory,
      },
    });

    // Store interaction
    await dbService.storeInteraction({
      userId,
      message,
      response: "", // Will be updated when stream completes
      metadata: {
        walletState,
        timestamp: new Date().toISOString(),
      },
    });

    return stream;
  }
}
