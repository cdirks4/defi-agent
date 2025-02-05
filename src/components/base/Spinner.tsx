interface SpinnerProps {
  color?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const Spinner = ({ color = "border-black", size = "md" }: SpinnerProps) => {
  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-2 border-b-transparent ${color}`}
      />
    </div>
  );
};

export default Spinner;
