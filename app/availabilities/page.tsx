"use client";

import { useEffect, useMemo } from "react";
import { useTopBar } from "../../component/topbarContext";

type SlotStatus = "Open" | "Closed";

interface Availability {
  available: number;
  total: number;
  status: SlotStatus;
}

export default function Availabilities() {

  const { setTopBar } = useTopBar();
  useEffect(() => {
    setTopBar(
      "Availabilities",
    );
  }, [setTopBar]);


  const days = useMemo(
    () => ["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25", "Sat 26", "Sun 27"],
    []
  );

  const timelineStart = "08:00";
  const timelineEnd = "18:00";
  const slotMinutes = 30;

  // Generate 24-hour time slots
  const timeSlots = useMemo(() => {
    const start = parseTimeToMinutes(timelineStart);
    const end = parseTimeToMinutes(timelineEnd);
    const slots: string[] = [];
    for (let t = start; t <= end; t += slotMinutes) {
      slots.push(formatMinutesTo24h(t));
    }
    return slots;
  }, []);

  // Generate mock data based on rules
  const mockData = useMemo(() => {
    const data: Record<string, Record<string, Availability>> = {};

    days.forEach((day) => {
      data[day] = {};
      timeSlots.forEach((time) => {
        // Simulate closing early on Sunday and Monday for the demo
        const isClosed = (day === "Mon 21" || day === "Sun 27") && time >= "16:00";
        const total = 10;
        let available = total;
        const status: SlotStatus = isClosed ? "Closed" : "Open";

        if (isClosed) {
          available = 0;
        } else {
          // Randomize states for illustration
          const rand = Math.random();
          if (rand < 0.1) {
            available = 0; // Full
          } else if (rand < 0.3) {
            available = Math.floor(Math.random() * 2) + 1; // 1 or 2 (Almost full - <= 20%)
          } else {
            available = Math.floor(Math.random() * 8) + 3; // 3 to 10 (Open - > 20%)
          }
        }

        data[day][time] = { available, total, status };
      });
    });
    return data;
  }, [days, timeSlots]);

  return (
    <div className="flex flex-col p-8 h-[calc(100vh-70px)] overflow-hidden bg-background-light font-display">
      
      {/* Scrollable Grid Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col w-full shadow-sm">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          
          {/* min-w-[800px] ensures it doesn't crush too much on very small screens, 
            w-full lets it expand, and flex-1 on the columns handles the equal spreading.
          */}
          <div className="w-full min-w-[800px] flex flex-col pb-4">
            
            {/* X-Axis: Days Header (Sticky Top) */}
            <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
              <div className="w-24 flex-shrink-0 sticky left-0 z-40 bg-white border-r border-gray-200">
                {/* Empty corner cell */}
              </div>
              {days.map((day) => (
                <div
                  key={day}
                  className="flex-1 px-2 py-3 text-sm font-bold text-gray-800 flex items-center justify-center border-r border-gray-200 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Y-Axis & Grid Body */}
            {timeSlots.map((time) => (
              <div
                key={time}
                className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50/50 transition-colors group"
              >
                {/* Time Label Column (Sticky Left) */}
                <div className="w-24 flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-200 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-500 font-medium">
                    {format24hTo12h(time)}
                  </span>
                </div>

                {/* Data Cells */}
                {days.map((day) => {
                  const cellData = mockData[day][time];
                  return (
                    <div
                      key={`${day}-${time}`}
                      className="flex-1 p-1 border-r border-gray-200 last:border-r-0"
                    >
                      <CellRenderer data={cellData} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component to render the specific state of the cell
function CellRenderer({ data }: { data: Availability }) {
  // Extracted base styles to match the HTML references perfectly
  const baseClasses = "h-10 w-full rounded-lg cursor-pointer flex items-center justify-center text-xs transition-colors";

  if (data.status === "Closed") {
    return (
      <div className={`${baseClasses} bg-red-light text-red-dark hover:bg-red-500/20 hover:border border-red-500/40`}>
        Closed
      </div>
    );
  }

  if (data.available === 0) {
    return (
      <div className={`${baseClasses} bg-red-light text-red-dark hover:bg-red-500/20 hover:border border-red-500/40`}>
        Full
      </div>
    );
  }

  const percentage = data.available / data.total;

  if (percentage <= 0.2) {
    return (
      <div className={`${baseClasses} bg-orange-light text-orange-dark hover:bg-orange-500/20 hover:border border-orange-500/40`}>
        {data.available}/{data.total}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-green-light text-green-dark hover:bg-green-500/20 hover:border border-green-500/40`}>
      {data.available === data.total ? "Open" : `${data.available}/${data.total}`}
    </div>
  );
}

// --- Utility Functions ---

function parseTimeToMinutes(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function formatMinutesTo24h(totalMinutes: number) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function format24hTo12h(time24: string) {
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${suffix}`;
}