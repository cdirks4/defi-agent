import AssistantSpeechIndicator from "./call/AssistantSpeechIndicator";
import Button from "./base/Button";
import VolumeLevel from "./call/VolumeLevel";

interface ActiveCallDetailProps {
  assistantIsSpeaking: boolean;
  volumeLevel: number;
  onEndCallClick: () => void;
}

const ActiveCallDetail = ({
  assistantIsSpeaking,
  volumeLevel,
  onEndCallClick,
}: ActiveCallDetailProps) => {
  return (
    <div>
      <div className="flex flex-row items-center justify-center p-4 border border-gray-200 rounded-lg shadow-md w-[400px] h-[100px]">
        <AssistantSpeechIndicator isSpeaking={assistantIsSpeaking} />
        <VolumeLevel volume={volumeLevel} />
      </div>
      <div className="mt-5 text-center">
        <Button label="End Call" onClick={onEndCallClick} />
      </div>
    </div>
  );
};

export default ActiveCallDetail;
