declare module "@vapi-ai/web" {
  export default class Vapi {
    constructor(apiKey: string);
    start(config: any): void;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}
