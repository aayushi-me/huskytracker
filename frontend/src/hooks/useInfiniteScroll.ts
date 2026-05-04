import { useEffect } from "react";

export default function useInfiniteScroll(callback: () => void) {
  useEffect(() => {
    function handleScroll() {
      const scrollBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;

      if (scrollBottom) callback();
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback]);
}
