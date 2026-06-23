import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Seat {
  code: string;
  label: string;
  status: "available" | "held" | "sold" | "blocked";
}

interface Row {
  label: string;
  seats: Seat[];
}

interface Section {
  name: string;
  code: string;
  rows: Row[];
}

interface SeatMapProps {
  sections: Section[];
  onSelectionChange: (selectedSeats: string[]) => void;
  maxSelectable?: number;
}

export function SeatMap({ sections, onSelectionChange, maxSelectable = 10 }: SeatMapProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  useEffect(() => {
    onSelectionChange(selectedSeats);
  }, [selectedSeats, onSelectionChange]);

  const toggleSeat = (seatCode: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedSeats((current) => {
      if (current.includes(seatCode)) {
        return current.filter((c) => c !== seatCode);
      } else {
        if (current.length >= maxSelectable) {
          alert(`You can only select up to ${maxSelectable} seats.`);
          return current;
        }
        return [...current, seatCode];
      }
    });
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface p-6 shadow-inner">
      <div className="mb-6 flex items-center justify-center gap-6 text-sm font-semibold text-muted">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-border bg-surface-2" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-accent bg-accent text-accent-foreground" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-surface-3 opacity-50" />
          <span>Sold/Held</span>
        </div>
      </div>

      <div className="mb-8 mt-4 rounded-xl border border-border/50 bg-surface-3 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted">
        STAGE
      </div>

      <div className="flex min-w-max flex-col items-center gap-8">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="flex flex-col items-center gap-3">
            <h4 className="mb-2 text-xs font-bold uppercase text-muted">{section.name}</h4>
            {section.rows.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-4">
                <span className="w-6 text-right text-xs font-bold text-muted">{row.label}</span>
                <div className="flex gap-2">
                  {row.seats.map((seat) => {
                    const isAvailable = seat.status === "available";
                    const isSelected = selectedSeats.includes(seat.code);

                    return (
                      <button
                        key={seat.code}
                        type="button"
                        onClick={() => toggleSeat(seat.code, isAvailable)}
                        disabled={!isAvailable}
                        title={`Seat ${seat.code} (${seat.status})`}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition-all",
                          isSelected
                            ? "border-accent bg-accent text-accent-foreground shadow-[0_0_10px_rgba(var(--accent),0.5)]"
                            : isAvailable
                            ? "border-border bg-surface-2 text-foreground hover:border-accent hover:bg-surface-3"
                            : "cursor-not-allowed border-transparent bg-surface-3 text-muted/30"
                        )}
                      >
                        {seat.label}
                      </button>
                    );
                  })}
                </div>
                <span className="w-6 text-left text-xs font-bold text-muted">{row.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
