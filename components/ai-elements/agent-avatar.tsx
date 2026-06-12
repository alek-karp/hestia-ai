import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ComponentProps } from "react";

export type AgentAvatarProps = ComponentProps<"div"> & {
  alt: string;
  background?: string;
  size?: number;
  src: string;
};

export function AgentAvatar({ alt, background, className, size = 32, src, style, ...props }: AgentAvatarProps) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, background, ...style }}
      {...props}
    >
      <Image alt={alt} className="object-cover" fill sizes={`${size}px`} src={src} />
    </div>
  );
}
