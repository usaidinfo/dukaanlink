"use client";

import { useEffect, useRef, useState } from "react";

export default function LazyImage({
  src,
  alt = "",
  className,
  style,
  eager = false,
}) {
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(Boolean(eager));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (eager || visible || !src) return;
    const node = wrapRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "280px 0px", threshold: 0.01 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [eager, visible, src]);

  if (!src || failed) return null;

  return (
    <span ref={wrapRef} className="lazy-image-wrap">
      {visible ? (
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="lazy-image-slot" aria-hidden="true" />
      )}
    </span>
  );
}
