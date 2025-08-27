import * as React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 64, height = 64 }: LogoProps) {
  return (
    <Image
      src="/favicon.ico"
      alt="Zanzibar Coat of Arms"
      width={width}
      height={height}
      className={className}
    />
  );
}