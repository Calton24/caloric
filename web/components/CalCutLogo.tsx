import Image from "next/image";

type CalCutLogoProps = {
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
} as const;

export function CalCutLogo({ size = "md", className = "" }: CalCutLogoProps) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden bg-black ring-1 ring-brand/30 transition group-hover:ring-brand/45 ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/calcut-logo.jpg"
        alt=""
        fill
        sizes={size === "sm" ? "32px" : "36px"}
        className="object-contain p-0.5"
        priority={size === "md"}
      />
    </span>
  );
}
