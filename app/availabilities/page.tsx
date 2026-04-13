"use client";

import { useEffect, useMemo, useState } from "react";
import { useTopBar } from "../../component/topbarContext";
import WeekSelector from "../../component/weekSelector";
import { config } from "../../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;
const slotMinutes = Number(config.slot) || 30; // Use config slot or default to 30

type SlotStatus = "Open" | "Closed";

interface Availability {
  available: number;
  total: number;
  status: SlotStatus;
}

// Data structure to hold the processed API results
// { "YYYY-MM-DD": { "HH:MM": { available, total, status } } }
type AggregatedData = Record<string, Record<string, Availability>>;

// Helper to add/subtract days from a date
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function Availabilities() {
  const { setTopBar } = useTopBar();
  const [currentDate, setCurrentDate] = useState(new Date());

  // State for the processed grid data
  const [gridData, setGridData] = useState<AggregatedData>({});
  const [isLoading, setIsLoading] = useState(true);

  // We'll calculate the dynamic timeline based on all 7 days of store hours
  const [timelineConfig, setTimelineConfig] = useState({
    start: "08:00",
    end: "18:30",
  });

  // --- TOP BAR WITH STYLIZED WEEK SELECTOR ---
  useEffect(() => {
    const weekStart = currentDate;
    const weekEnd = addDays(currentDate, 6);

    const formatShortDate = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    setTopBar(
      "Availabilities",
      <div className="flex gap-4 items-center">
        <WeekSelector selectedDate={currentDate} onChange={setCurrentDate} />

        {/* Quick jump to current week */}
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>,
    );
  }, [setTopBar, currentDate]);

  // Generate the 7-day array based on the selected Date
  const dateStrings = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  }, [currentDate]);

  // Generate the display headers for the grid (e.g., "Mon 21")
  const daysHeader = useMemo(() => {
    const formatDay = (dateStr: string) => {
      const d = new Date(dateStr);
      // Format as "Mon 21"
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      });
    };
    return dateStrings.map(formatDay);
  }, [dateStrings]);

  // The main data fetching and aggregation effect
  useEffect(() => {
    const fetch7DayData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Total Tables (Only need this once)
        const tablesRes = await fetch(
          `${baseUrl}/restaurant/${restaurantId}/table`,
        );
        let numTables = 0;
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          numTables = tablesData?.getTable?.length || 0;
        }

        // 2. Fetch Store Hours & Availability for all 7 days concurrently
        const hoursPromises = dateStrings.map((date) =>
          fetch(
            `${baseUrl}/restaurant/${restaurantId}/availability/store-hour/?date=${date}`,
          ).then((res) => (res.ok ? res.json() : null)),
        );

        const availPromises = dateStrings.map((date) =>
          fetch(
            `${baseUrl}/restaurant/${restaurantId}/availability/table/?date=${date}`,
          ).then((res) => (res.ok ? res.json() : null)),
        );

        const [hoursResults, availResults] = await Promise.all([
          Promise.all(hoursPromises),
          Promise.all(availPromises),
        ]);

        // 3. Process Store Hours to find the dynamic timeline range
        let earliestOpen = "23:59";
        let latestClose = "00:00";
        const dailyStoreHours: Record<
          string,
          { isClosed: boolean; ranges: { open: number; close: number }[] }
        > = {};

        dateStrings.forEach((date, i) => {
          const hourData = hoursResults[i]?.formattedGetEffectiveStoreHour;
          const isClosed = hourData?.isClosed || false;
          const ranges: { open: number; close: number }[] = [];

          if (!isClosed && hourData?.openCloseTimes) {
            hourData.openCloseTimes.forEach((t: any) => {
              if (t.openTime < earliestOpen) earliestOpen = t.openTime;
              if (t.closeTime > latestClose) latestClose = t.closeTime;
              ranges.push({
                open: parseTimeToMinutes(t.openTime),
                close: parseTimeToMinutes(t.closeTime),
              });
            });
          }
          dailyStoreHours[date] = { isClosed, ranges };
        });

        // Fallback if the restaurant is closed all 7 days
        if (earliestOpen === "23:59") earliestOpen = "08:00";
        if (latestClose === "00:00") latestClose = "18:00";

        setTimelineConfig({ start: earliestOpen, end: latestClose });

        // 4. Process Availability into our Aggregated Data Map
        const aggregated: AggregatedData = {};
        const minStart = parseTimeToMinutes(earliestOpen);
        const maxEnd = parseTimeToMinutes(latestClose);

        dateStrings.forEach((date, i) => {
          aggregated[date] = {};
          const storeInfo = dailyStoreHours[date];
          const availData =
            availResults[i]?.formattedGetEffectiveTableAvailability || [];

          // Create an array of free minutes for every single table.
          const tableAvailabilities = availData.map((table: any) => {
            const chunks = table.availabilities || [];
            return chunks.map((c: any) => ({
              open: parseTimeToMinutes(c.openTime),
              close: parseTimeToMinutes(c.closeTime),
            }));
          });

          // Loop through every possible slot
          for (
            let timeVal = minStart;
            timeVal < maxEnd;
            timeVal += slotMinutes
          ) {
            const timeStr = formatMinutesTo24h(timeVal);
            const slotStart = timeVal;
            const slotEnd = timeVal + slotMinutes;

            // Check if this specific slot falls within the restaurant's open hours for this specific day
            const isOpenTime =
              !storeInfo.isClosed &&
              storeInfo.ranges.some(
                (r) => slotStart >= r.open && slotEnd <= r.close,
              );

            let availableCount = 0;

            if (isOpenTime) {
              // Count how many tables are completely free for this entire chunk
              tableAvailabilities.forEach((chunks: any) => {
                const isTableFree = chunks.some(
                  (c: any) => slotStart >= c.open && slotEnd <= c.close,
                );
                if (isTableFree) availableCount++;
              });
            }

            aggregated[date][timeStr] = {
              status: isOpenTime ? "Open" : "Closed",
              total: numTables,
              available: availableCount,
            };
          }
        });

        setGridData(aggregated);
      } catch (error) {
        console.error("Error fetching 7-day availability:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetch7DayData();
  }, [currentDate, dateStrings]);

  // Generate the Y-Axis rows based on the dynamic timeline
  const timeSlots = useMemo(() => {
    const start = parseTimeToMinutes(timelineConfig.start);
    const end = parseTimeToMinutes(timelineConfig.end);
    const slots: string[] = [];
    for (let t = start; t < end; t += slotMinutes) {
      slots.push(formatMinutesTo24h(t));
    }
    return slots;
  }, [timelineConfig]);

  return (
    <div className="flex flex-col p-8 h-[calc(100vh-70px)] overflow-hidden bg-background-light font-display relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center m-8 rounded-xl">
          <span className="text-gray-500 font-medium">
            Loading 7-day availability...
          </span>
        </div>
      )}

      {/* Scrollable Grid Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col w-full shadow-sm relative h-full">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <div className="w-full min-w-[800px] flex flex-col pb-4">
            {/* X-Axis: Days Header (Sticky Top) */}
            <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
              <div className="w-24 flex-shrink-0 sticky left-0 z-40 bg-white border-r border-gray-200">
                {/* Empty corner cell */}
              </div>
              {daysHeader.map((dayLabel, idx) => (
                <div
                  key={dayLabel}
                  className="flex-1 px-2 py-3 text-sm font-bold text-gray-800 flex flex-col items-center justify-center border-r border-gray-200 last:border-r-0"
                >
                  <span>{dayLabel}</span>
                  <span className="text-[10px] font-normal text-gray-400">
                    {dateStrings[idx]}
                  </span>
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
                {dateStrings.map((dateStr) => {
                  const cellData = gridData[dateStr]?.[time] || {
                    available: 0,
                    total: 0,
                    status: "Closed",
                  };
                  return (
                    <div
                      key={`${dateStr}-${time}`}
                      className="flex-1 p-1 border-r border-gray-200 last:border-r-0"
                    >
                      <CellRenderer data={cellData} />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Empty state message if dates are completely empty/closed */}
            {!isLoading && timeSlots.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No availability data found for this week.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component to render the specific state of the cell
function CellRenderer({ data }: { data: Availability }) {
  const baseClasses =
    "h-10 w-full rounded-lg cursor-pointer flex items-center justify-center text-xs transition-colors";

  if (data.status === "Closed") {
    return (
      <div
        className={`${baseClasses} bg-red-light text-red-dark hover:bg-red-500/20 hover:border border-red-500/40`}
      >
        Closed
      </div>
    );
  }

  // Prevent divide by zero error if total is 0
  if (data.total === 0) {
    return (
      <div className={`${baseClasses} bg-gray-100 text-gray-400`}>N/A</div>
    );
  }

  if (data.available === 0) {
    return (
      <div
        className={`${baseClasses} bg-red-light text-red-dark hover:bg-red-500/20 hover:border border-red-500/40`}
      >
        Full
      </div>
    );
  }

  const percentage = data.available / data.total;

  if (percentage <= 0.3) {
    return (
      <div
        className={`${baseClasses} bg-orange-light text-orange-dark hover:bg-orange-500/20 hover:border border-orange-500/40`}
      >
        {data.available}/{data.total}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} bg-green-light text-green-dark hover:bg-green-500/20 hover:border border-green-500/40`}
    >
      {data.available === data.total
        ? "Open"
        : `${data.available}/${data.total}`}
    </div>
  );
}

// --- Utility Functions ---

function parseTimeToMinutes(time: string) {
  if (!time) return 0;
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function formatMinutesTo24h(totalMinutes: number) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function format24hTo12h(time24: string) {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minStr} ${suffix}`;
}