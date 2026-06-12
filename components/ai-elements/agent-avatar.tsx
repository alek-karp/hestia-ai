import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ComponentProps } from "react";

export type AgentAvatarProps = ComponentProps<"div"> & {
  alt: string;
  background?: string;
  size?: number;
  src?: string;
  emoji?: string;
};

export function AgentAvatar({ alt, background, className, size = 32, src, emoji, style, ...props }: AgentAvatarProps) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full flex items-center justify-center", className)}
      style={{ width: size, height: size, background, ...style }}
      {...props}
    >
      {src ? (
        <Image alt={alt} className="object-cover" fill sizes={`${size}px`} src={src} />
      ) : (
        <span style={{ fontSize: size * 0.45, lineHeight: 1 }}>{emoji}</span>
      )}
    </div>
  );
}
