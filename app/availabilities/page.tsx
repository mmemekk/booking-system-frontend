"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTopBar } from "../../component/topbarContext";
import WeekSelector from "../../component/weekSelector";
import { useSlot } from "../../hooks/useSlot";
import { Close, TableRestaurantOutlined, PeopleAlt } from "@mui/icons-material";
import { config } from "../../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

type SlotStatus = "Open" | "Closed";

interface TableInfo {
  id: number;
  name: string;
  capacity: number;
}

interface TableAvailability {
  id: number;
  name: string;
  capacity: number;
  chunks: { open: number; close: number }[];
}

interface Availability {
  available: number;
  total: number;
  status: SlotStatus;
  tables: TableInfo[]; // Newly added to hold the exact available tables
}

// Data structure to hold the processed API results
// { "YYYY-MM-DD": { "HH:MM": { available, total, status, tables } } }
type AggregatedData = Record<string, Record<string, Availability>>;

// Helper to add/subtract days from a date
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function Availabilities() {
  const { setTopBar } = useTopBar();
  const { slot } = useSlot();
  const slotMinutes = Number(slot) || 30;

  const [currentDate, setCurrentDate] = useState(new Date());

  // State for the processed grid data
  const [gridData, setGridData] = useState<AggregatedData>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: State for Side Panel ---
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);

  // Dynamic Height Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // We'll calculate the dynamic timeline based on all 7 days of store hours
  const [timelineConfig, setTimelineConfig] = useState({
    start: "08:00",
    end: "18:30",
  });

  // --- TOP BAR WITH STYLIZED WEEK SELECTOR ---
  useEffect(() => {
    const weekStart = currentDate;
    const weekEnd = addDays(currentDate, 6);

    setTopBar(
      "Availabilities",
      <div className="flex gap-4 items-center">
        <WeekSelector
          selectedDate={currentDate}
          onChange={(newDate) => {
            setCurrentDate(newDate);
            setSelectedSlot(null); // Close panel on week change
          }}
        />

        {/* Quick jump to current week */}
        <button
          onClick={() => {
            setCurrentDate(new Date());
            setSelectedSlot(null);
          }}
          className="px-4 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>,
    );
  }, [setTopBar, currentDate]);

  // Resize Observer to track container height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
          const tableAvailabilities: TableAvailability[] = availData.map(
            (table: any) => {
              const chunks = table.availabilities || [];
              return {
                id: table.id,
                name: table.name,
                capacity: table.capacity,
                chunks: chunks.map((c: any) => ({
                  // Handled gracefully in case API returns 'from'/'to' OR 'openTime'/'closeTime'
                  open: parseTimeToMinutes(c.openTime || c.from),
                  close: parseTimeToMinutes(c.closeTime || c.to),
                })),
              };
            },
          );

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

            const availableTablesForThisSlot: TableInfo[] = [];

            if (isOpenTime) {
              // Extract EXACT tables free for this entire chunk
              tableAvailabilities.forEach((t: TableAvailability) => {
                const isTableFree = t.chunks.some(
                  (c) => slotStart >= c.open && slotEnd <= c.close,
                );
                if (isTableFree) {
                  availableTablesForThisSlot.push({
                    id: t.id,
                    name: t.name,
                    capacity: t.capacity,
                  });
                }
              });
            }

            aggregated[date][timeStr] = {
              status: isOpenTime ? "Open" : "Closed",
              total: numTables,
              available: availableTablesForThisSlot.length,
              tables: availableTablesForThisSlot, // Push array into grid mapping
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

  // --- Dynamic Layout Dimensions ---
  const minRowHeightPx = 48; // Ensure minimum height so cells aren't too squished
  const headerHeightPx = 60; // Approximate height of the table header

  const availableTimelineHeight = containerHeight - headerHeightPx;
  const stretchedRowHeight =
    timeSlots.length > 0
      ? availableTimelineHeight / timeSlots.length
      : minRowHeightPx;
  const rowHeightPx = Math.max(minRowHeightPx, stretchedRowHeight);

  // Get data for selected slot to display in the side panel
  const selectedCellData = selectedSlot
    ? gridData[selectedSlot.date]?.[selectedSlot.time]
    : null;

  return (
    <div className="flex flex-col p-8 h-[calc(100vh-70px)] overflow-hidden bg-background-light font-display relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center m-8 rounded-xl">
          <span className="text-gray-500 font-medium">
            Loading 7-day availability...
          </span>
        </div>
      )}

      {/* Main Layout wrapper for Grid & Panel */}
      <div className="flex flex-row w-full h-full items-stretch">
        {/* Scrollable Grid Container */}
        <div
          ref={containerRef}
          className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm relative min-w-0 transition-all duration-300"
        >
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <div className="w-full min-w-[800px] flex flex-col pb-4 h-full">
              {/* X-Axis: Days Header (Sticky Top) */}
              <div
                className="flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm"
                style={{ height: headerHeightPx }}
              >
                <div className="w-24 flex-shrink-0 sticky left-0 z-40 bg-white border-r border-gray-200">
                  {/* Empty corner cell */}
                </div>
                {daysHeader.map((dayLabel, idx) => (
                  <div
                    key={dayLabel}
                    className="flex-1 px-2 py-3 text-sm font-bold text-gray-800 flex flex-col items-center justify-center border-r border-gray-200 last:border-r-0 h-full"
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
                  style={{ height: rowHeightPx }}
                >
                  {/* Time Label Column (Sticky Left) */}
                  <div className="w-24 flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-200 flex items-center justify-center group-hover:bg-gray-50 transition-colors h-full">
                    <span className="text-xs text-gray-500 font-medium">
                      {time}
                    </span>
                  </div>

                  {/* Data Cells */}
                  {dateStrings.map((dateStr) => {
                    const cellData = gridData[dateStr]?.[time] || {
                      available: 0,
                      total: 0,
                      status: "Closed",
                      tables: [],
                    };

                    const isSelected =
                      selectedSlot?.date === dateStr &&
                      selectedSlot?.time === time;

                    return (
                      <div
                        key={`${dateStr}-${time}`}
                        className="flex-1 p-1 border-r border-gray-200 last:border-r-0 h-full"
                      >
                        <CellRenderer
                          data={cellData}
                          isSelected={isSelected}
                          onClick={() => {
                            if (cellData.status !== "Closed") {
                              // Toggle selection off if already selected, otherwise set it
                              if (isSelected) setSelectedSlot(null);
                              else
                                setSelectedSlot({ date: dateStr, time: time });
                            }
                          }}
                        />
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

        {/* Side Panel pushing in from right */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 flex flex-col ${
            selectedSlot ? "w-80 opacity-100 ml-6" : "w-0 opacity-0 ml-0"
          }`}
        >
          <div className="w-80 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">
                  Available Tables
                </h3>
                {selectedSlot && (
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    {new Date(selectedSlot.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • {selectedSlot.time}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                <Close fontSize="small" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-5 flex-1 overflow-y-auto">
              {selectedCellData && selectedCellData.tables.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {selectedCellData.tables.length} Tables Available
                  </div>
                  {selectedCellData.tables.map((table) => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <TableRestaurantOutlined fontSize="small" />
                        </div>
                        <span className="font-bold text-gray-800">
                          Table {table.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2.5 py-1 rounded text-sm font-medium">
                        <PeopleAlt fontSize="inherit" />
                        <span>{table.capacity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-10">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <TableRestaurantOutlined fontSize="large" />
                  </div>
                  <h4 className="text-gray-900 font-bold mb-1">
                    No Tables Available
                  </h4>
                  <p className="text-sm text-gray-500">
                    The restaurant is fully booked for this time slot.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component to render the specific state of the cell
function CellRenderer({
  data,
  isSelected,
  onClick,
}: {
  data: Availability;
  isSelected: boolean;
  onClick: () => void;
}) {
  const baseClasses = `h-full w-full rounded-lg flex items-center justify-center text-xs transition-all ${
    data.status !== "Closed"
      ? "cursor-pointer"
      : "cursor-not-allowed opacity-80"
  } ${isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-[0.98] shadow-md" : "hover:scale-[0.98]"}`;

  if (data.status === "Closed") {
    return (
      <div className={`${baseClasses} bg-red-light text-red-dark`}>Closed</div>
    );
  }

  // Prevent divide by zero error if total is 0
  if (data.total === 0) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-gray-100 text-gray-400 hover:bg-gray-200`}
      >
        N/A
      </div>
    );
  }

  if (data.available === 0) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-red-light text-red-dark hover:bg-red-200`}
      >
        Full
      </div>
    );
  }

  const percentage = data.available / data.total;

  if (percentage <= 0.3) {
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} bg-orange-light text-orange-dark hover:bg-orange-200`}
      >
        {data.available}/{data.total}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} bg-green-light text-green-dark hover:bg-green-200`}
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
