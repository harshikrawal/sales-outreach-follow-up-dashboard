"use client";

import { useEffect, useRef } from "react";
import LoadingBar from "react-top-loading-bar";

export default function Loading() {
  const ref = useRef<any>(null);

  useEffect(() => {
    // Start the loading bar continuously
    if (ref.current) {
      ref.current.continuousStart();
    }
    
    // Complete the loading bar right before unmounting (when data finishes loading)
    return () => {
      if (ref.current) {
        ref.current.complete();
      }
    };
  }, []);

  return (
    <div className="w-full min-h-[50vh]">
      {/* react-top-loading-bar automatically fixes itself to the top of the window */}
      <LoadingBar color="#CC5500" ref={ref} height={3} shadow={true} />
    </div>
  );
}
