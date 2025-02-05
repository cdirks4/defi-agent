interface AssistantSpeechIndicatorProps {
  isSpeaking: boolean;
}

const AssistantSpeechIndicator = ({
  isSpeaking,
}: AssistantSpeechIndicatorProps) => {
  return (
    <div className="flex items-center mb-2.5">
      <div
        className={`w-5 h-5 mr-2.5 rounded ${
          isSpeaking ? "bg-[#3ef07c]" : "bg-[#f03e3e]"
        }`}
      />
    </div>
  );
};

export default AssistantSpeechIndicator;
