import type { DetectedApp } from "@/lib/system-checks/detected-app";

type AppIconProps = {
  app: DetectedApp;
  size?: "sm" | "md";
};

export default function AppIcon({ app, size = "md" }: AppIconProps) {
  const dimension = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  if (app.iconDataUrl) {
    return (
      <img
        src={app.iconDataUrl}
        alt={app.displayName}
        className={`${dimension} shrink-0 rounded-md border border-gray-200 bg-white object-contain`}
      />
    );
  }

  return (
    <div
      className={`${dimension} flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500`}
      title={app.displayName}
    >
      ?
    </div>
  );
}
