// This service is deprecated as trading decisions are now handled directly in the frontend components
export class AgentDecisionService {
  async makeTradeDecision() {
    throw new Error("This service is deprecated. Trading decisions are now handled in the frontend.");
  }

  async executeTrade() {
    throw new Error("This service is deprecated. Trading execution is now handled directly through the trading service.");
  }
}

export const agentDecisionService = new AgentDecisionService();
