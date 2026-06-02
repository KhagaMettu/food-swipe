"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  url: string;
}

/**
 * QRCodeDisplay — renders a QR code encoding the session URL.
 * Min 200×200px with high contrast and adequate quiet zone.
 * Responsive: hidden below 375px viewport width.
 */
export default function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  return (
    <div className="hidden min-[375px]:flex flex-col items-center gap-2">
      <div className="rounded-xl bg-white p-3 sm:p-4">
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#023047"
          marginSize={2}
          className="h-[150px] w-[150px] sm:h-[200px] sm:w-[200px]"
        />
      </div>
      <p className="text-xs font-medium text-[#023047]/70">Scan to join</p>
    </div>
  );
}
