/**
 * UnreadBadge Component
 * Displays a red circular badge with unread count
 * Animates when count changes
 */

import { useEffect, useState } from "react";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export default function UnreadBadge({ count, className = "" }: UnreadBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  // Trigger animation when count changes
  useEffect(() => {
    if (count !== prevCount && count > 0) {
      setIsAnimating(true);
      setPrevCount(count);
      
      // Reset animation after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  if (count <= 0) {
    return null;
  }

  const displayCount = count > 9 ? "9+" : String(count);

  return (
    <span
      key={count} // Key prop ensures re-render on count change
      className={`
        absolute -top-1 -right-1 
        flex items-center justify-center
        min-w-[18px] h-[18px] px-1
        bg-red-500 text-white
        text-[10px] font-semibold
        rounded-full
        border-2 border-white
        transition-all duration-300
        ${isAnimating ? "animate-pulse scale-110" : "animate-pulse"}
        ${className}
      `}
      aria-label={`${count} unread notification${count !== 1 ? "s" : ""}`}
    >
      {displayCount}
    </span>
  );
}
