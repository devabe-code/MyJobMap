import { memo, type ReactNode } from "react";

type CustomMarkerProps = {
  /** Border and accent color for the marker */
  pinColor?: string;
  /** Fill color inside the marker */
  backgroundColor?: string;
  /** Color for icon or text inside the marker */
  contentColor?: string;
  /** Diameter of the marker in pixels */
  size?: number;
  /** Icon or label rendered inside the marker */
  children?: ReactNode;
  /** Whether the marker is in a selected / active state */
  isSelected?: boolean;
};

function CustomMarker({
  pinColor = "#22c55e",
  backgroundColor,
  contentColor = "#f9fafb",
  size = 36,
  children,
  isSelected = false,
}: CustomMarkerProps) {
  const resolvedBackground =
    backgroundColor ||
    (pinColor.startsWith("#") && pinColor.length === 7
      ? `${pinColor}33`
      : "rgba(52,211,153,0.2)");

  return (
    <div className="flex flex-col items-center">
      <div
        className={[
          "flex items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-lg transition hover:scale-110 cursor-pointer",
          isSelected ? "ring-4 ring-white/70 scale-110" : "",
        ].join(" ")}
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderColor: pinColor,
          backgroundColor: resolvedBackground,
          color: contentColor,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: size / 3,
          height: size / 3,
          marginTop: -size / 10,
          backgroundColor: pinColor,
          transform: "rotate(45deg)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

export default memo(CustomMarker);
