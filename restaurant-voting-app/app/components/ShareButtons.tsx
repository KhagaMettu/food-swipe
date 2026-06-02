"use client";

import React, { useState, useCallback } from "react";

interface ShareButtonsProps {
  url: string;
}

/**
 * ShareButtons — "Copy Link" and "Share" buttons for session URL sharing.
 * Uses navigator.share when available, falls back to clipboard copy.
 */
export default function ShareButtons({ url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my MunchMatch session", url });
      } catch (err) {
        // User cancelled or share failed — fall back to copy
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  }, [url, copyToClipboard]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyToClipboard}
        className="rounded-lg px-3 py-2 text-xs font-semibold bg-[#023047] text-white hover:bg-[#023047]/80 transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Copy session link"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
      <button
        onClick={handleShare}
        className="rounded-lg px-3 py-2 text-xs font-semibold bg-[#219EBC] text-white hover:bg-[#219EBC]/80 transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Share session link"
      >
        Share
      </button>
    </div>
  );
}
