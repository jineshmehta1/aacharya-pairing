"use client";

import React, { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZoomableTableProps {
  children: React.ReactNode;
}

export function ZoomableTable({ children }: ZoomableTableProps) {
  const [isFitMode, setIsFitMode] = useState(true);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<string | number>("auto");
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !contentRef.current) return;
      
      const containerWidth = containerRef.current.parentElement?.clientWidth || containerRef.current.clientWidth;
      const contentWidth = 800; // min-w-[800px] of our table
      
      const mobileActive = containerWidth < contentWidth;
      setIsMobile(mobileActive);

      if (mobileActive && isFitMode) {
        const newScale = containerWidth / contentWidth;
        setScale(newScale);
        
        // Measure real height of table content and scale container height accordingly
        const contentHeight = contentRef.current.scrollHeight;
        setContainerHeight(contentHeight * newScale);
      } else {
        setScale(1);
        setContainerHeight("auto");
      }
    };

    // Run on mount and on resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Also observe mutations in content height (e.g. data updates)
    let resizeObserver: ResizeObserver | null = null;
    if (contentRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isFitMode]);

  return (
    <div className="relative w-full">
      {/* Controls Overlay for Mobile Screens */}
      {isMobile && (
        <div className="absolute right-4 -top-12 z-20 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFitMode(!isFitMode)}
            className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background transition-all border border-muted-foreground/20 rounded-full py-1 px-3 text-xs font-semibold flex items-center gap-1.5"
          >
            {isFitMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span>Zoom (100%)</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-primary" />
                <span>Fit Screen</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Table Wrapper */}
      <div
        ref={containerRef}
        className="w-full relative transition-all duration-300 ease-in-out"
        style={{
          height: isMobile && isFitMode ? containerHeight : "auto",
          overflow: isMobile && !isFitMode ? "auto" : "hidden",
        }}
      >
        <div
          ref={contentRef}
          className="transition-all duration-300 ease-in-out"
          style={{
            width: isMobile && isFitMode ? "800px" : "100%",
            transform: isMobile && isFitMode ? `scale(${scale})` : "scale(1)",
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
