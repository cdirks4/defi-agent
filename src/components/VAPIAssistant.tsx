"use client";

import { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import Button from "@/components/base/Button";
import ActiveCallDetail from "@/components/ActiveCallDetail";
import { getDeFiAssistant } from "@/assistants";

interface VAPIAssistantProps {
  userWalletAddress: string;
  agentWalletAddress: string;
  userId: string;
}

export default function VAPIAssistant({
  userWalletAddress,
  agentWalletAddress,
  userId,
}: VAPIAssistantProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const vapi = typeof window !== "undefined"
    ? new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY || "")
    : null;

  useEffect(() => {
    vapi?.on("call-start", () => {
      setConnecting(false);
      setConnected(true);
    });

    vapi?.on("call-end", () => {
      setConnecting(false);
      setConnected(false);
    });

    vapi?.on("speech-start", () => {
      setAssistantIsSpeaking(true);
    });

    vapi?.on("speech-end", () => {
      setAssistantIsSpeaking(false);
    });

    vapi?.on("volume-level", (level) => {
      setVolumeLevel(level);
    });

    vapi?.on("error", (error) => {
      console.error(error);
      setConnecting(false);
    });

    return () => {
      vapi?.stop();
    };
  }, []);

  const startCallInline = async () => {
    setConnecting(true);
    const assistant = await getDeFiAssistant(userId);
    const assistantWithContext = {
      ...assistant,
      agentWallet: agentWalletAddress,
      userWallet: userWalletAddress,
    };
    vapi?.start(assistantWithContext);
  };

  const endCall = () => {
    vapi?.stop();
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">AI Voice Assistant</h2>
      {!connected ? (
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Start a voice conversation with your AI trading assistant
          </p>
          <Button
            label="Start Conversation"
            onClick={startCallInline}
            isLoading={connecting}
            variant="primary"
            size="lg"
          />
        </div>
      ) : (
        <ActiveCallDetail
          assistantIsSpeaking={assistantIsSpeaking}
          volumeLevel={volumeLevel}
          onEndCallClick={endCall}
        />
      )}
    </div>
  );
}