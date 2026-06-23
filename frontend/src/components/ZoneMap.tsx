import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ZoneMap as ZoneMapType, Zone } from "@/data/types";

interface ZoneMapProps {
  zoneMap: ZoneMapType;
  onZoneSelect: (zone: Zone) => void;
  selectedZoneId?: string;
}

export function ZoneMap({ zoneMap, onZoneSelect, selectedZoneId }: ZoneMapProps) {
  const [activeZone, setActiveZone] = useState<string | undefined>(selectedZoneId);

  useEffect(() => {
    setActiveZone(selectedZoneId);
  }, [selectedZoneId]);

  const handleZoneClick = (zone: Zone) => {
    setActiveZone(zone.id);
    onZoneSelect(zone);
  };

  if (!zoneMap || !zoneMap.backgroundImage) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border bg-surface-2">
        <p className="text-muted">No visual map available.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-inner group">
      {/* Container maintains aspect ratio implicitly based on the image */}
      <img
        src={zoneMap.backgroundImage}
        alt="Event Seating Map"
        className="w-full h-auto object-contain pointer-events-none select-none"
      />
      
      {/* Zone Overlays */}
      <div className="absolute inset-0">
        {zoneMap.zones.map((zone) => {
          const isSelected = activeZone === zone.id;
          
          return (
            <button
              key={zone.id}
              onClick={() => handleZoneClick(zone)}
              className={cn(
                "absolute cursor-pointer transition-all duration-300",
                isSelected 
                  ? "opacity-80 scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10" 
                  : "opacity-40 hover:opacity-70 hover:scale-[1.01] hover:z-10"
              )}
              style={{
                top: `${zone.coordinates.y}%`,
                left: `${zone.coordinates.x}%`,
                width: `${zone.coordinates.width}%`,
                height: `${zone.coordinates.height}%`,
                backgroundColor: zone.color,
                borderRadius: "8px",
                border: isSelected ? "3px solid white" : "2px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(2px)",
              }}
              title={zone.name}
            >
              <div className="flex h-full w-full items-center justify-center text-center">
                <span className={cn(
                  "font-bold text-white drop-shadow-md transition-opacity duration-300",
                  isSelected ? "opacity-100 text-sm" : "opacity-0 group-hover:opacity-100 text-xs"
                )}>
                  {zone.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
