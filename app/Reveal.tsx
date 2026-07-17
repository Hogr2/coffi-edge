"use client";

import { useEffect, useRef, useState } from "react";

// Fade+rise wrapper: fades its (server-rendered) children in when they enter
// the viewport and back out when they leave, every time. This gentle fade
// plays for everyone, including reduced-motion users (only strong motion is
// gated — see globals.css).
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${Math.min(delay, 300)}ms` } : undefined}
    >
      {children}
    </div>
  );
}
