interface VolumeLevelProps {
  volume: number;
}

const numBars = 10;

const VolumeLevel = ({ volume }: VolumeLevelProps) => {
  return (
    <div className="p-5">
      <div className="flex mb-2.5">
        {Array.from({ length: numBars }, (_, i) => (
          <div
            key={i}
            className={`w-5 h-5 m-0.5 rounded ${
              i / numBars < volume ? "bg-[#3ef07c]" : "bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default VolumeLevel;
