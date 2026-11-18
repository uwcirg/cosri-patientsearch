import { useEffect, useState } from "react";

/*
 * Preloads an image and reports whether it can be displayed.
 * Returns "loading" | "loaded" | "error".
 * A missing src is treated as "error" so callers render nothing.
 */
export default function useImageStatus(src) {
  // keep the src alongside its status so a stale result for a previous src
  // is never reported
  const [result, setResult] = useState({ src: null, status: "loading" });

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      // a 200 response that isn't a decodable image ends up with no dimensions
      setResult({ src, status: img.naturalWidth > 0 ? "loaded" : "error" });
    };
    img.onerror = () => {
      if (!cancelled) setResult({ src, status: "error" });
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (!src) return "error";
  return result.src === src ? result.status : "loading";
}
