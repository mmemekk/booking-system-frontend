"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTopBar } from "../../component/topbarContext";
import DateSelector from "../../component/dateSelector";
import BookingModal, { BookingDetails } from "../../component/bookingModal";
import { config } from "../../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;
const slotMinutes = Number(config.slot) || 30; // Use config slot or default to 30

// Extend BookingDetails to ensure all required fields for the modal exist, 
// plus the extra fields needed for grid placement.
interface Booking extends BookingDetails {
  id: string;
  tableId: number; // Used for grid mapping
  endTime: string; 
  status: string; // Ensure TS knows this is a string coming from the API
}

type TableInfo = {
  id: number;
  name: string;
};

type TableException = {
  id: number;
  tableId: number;
  date: string;
  exceptTimeFrom: string;
  exceptTimeTo: string;
  isClosed: boolean;
  description: string;
};

export default function Bookings() {
  const { setTopBar } = useTopBar();
  
  // State for DateSelector and API Data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tableExceptions, setTableExceptions] = useState<TableException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [showExceptions, setShowExceptions] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dynamic Store Hours state
  const [storeHours, setStoreHours] = useState({ start: "08:00", end: "18:30", isClosed: false });

  // Dynamic Width & Height Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // --- Top bar configuration with Sliding Toggle Switch ---
  useEffect(() => {
    setTopBar(
      "Bookings",
      <div className="flex gap-4 items-center">
        <DateSelector 
          selectedDate={currentDate} 
          onChange={(newDate) => setCurrentDate(newDate)} 
        />
        
        {/* Sleek Switch Toggle */}
        <div 
          onClick={() => setShowExceptions(prev => !prev)}
          className="flex items-center gap-2.5 px-3 py-1.5 border border-gray-200 rounded-lg bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-600 select-none">
            Exceptions
          </span>
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out ${
              showExceptions ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                showExceptions ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Add Booking
        </button>
      </div>,
    );
  }, [setTopBar, currentDate, showExceptions]);

  // Resize Observer to track both width and height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch Data: Store Hours, Tables, Bookings, and Exceptions
  useEffect(() => {
    const fetchTimelineData = async () => {
      setIsLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const queryDate = `${year}-${month}-${day}`;

        // Fetch primary data concurrently
        const [storeHourRes, tablesRes, bookingsRes] = await Promise.all([
          fetch(`${baseUrl}/restaurant/${restaurantId}/availability/store-hour/?date=${queryDate}`),
          fetch(`${baseUrl}/restaurant/${restaurantId}/table`),
          fetch(`${baseUrl}/booking/${restaurantId}?bookingDate=${queryDate}`)
        ]);

        // 1. Process Store Hours
        let newStart = "08:00";
        let newEnd = "22:00";
        let isClosed = false;

        if (storeHourRes.ok) {
          const storeHourData = await storeHourRes.json();
          isClosed = storeHourData?.formattedGetEffectiveStoreHour?.isClosed || false;
          
          if (!isClosed) {
            const openCloseTimes = storeHourData?.formattedGetEffectiveStoreHour?.openCloseTimes || [];
            if (openCloseTimes.length > 0) {
              newStart = openCloseTimes.reduce((min: string, t: any) => t.openTime < min ? t.openTime : min, openCloseTimes[0].openTime);
              newEnd = openCloseTimes.reduce((max: string, t: any) => t.closeTime > max ? t.closeTime : max, openCloseTimes[0].closeTime);
            }
          }
        }
        setStoreHours({ start: newStart, end: newEnd, isClosed });

        // 2. Process Tables
        let mappedTables: TableInfo[] = [];
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          mappedTables = (tablesData?.getTable || []).map((t: any) => ({
            id: t.id,
            name: t.name
          }));
          setTables(mappedTables);
        }

        // 3. Process Exceptions (Fetch for each mapped table)
        try {
          const exceptionsPromises = mappedTables.map(t =>
            fetch(`${baseUrl}/restaurant/${restaurantId}/table/${t.id}/exception?date=${queryDate}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => data?.formattedTableException || [])
              .catch(() => []) // Silently catch individual table failures
          );
          const exceptionsArrays = await Promise.all(exceptionsPromises);
          setTableExceptions(exceptionsArrays.flat());
        } catch (err) {
          console.error("Failed to fetch exceptions", err);
          setTableExceptions([]);
        }

        // 4. Process Bookings
        if (bookingsRes.ok || bookingsRes.status === 404) {
          if (bookingsRes.status === 404) {
            setBookings([]);
          } else {
            const bookingsData = await bookingsRes.json();
            const mappedBookings: Booking[] = (bookingsData?.formattedBooking || []).map((b: any) => ({
              id: String(b.id),
              bookingRef: b.bookingRef,
              tableName: b.tableId, // Map tableId to tableName for the modal interface
              tableId: b.tableId, // Keep tableId for internal logic
              customerName: b.customerName,
              customerPhone: b.customerPhone,
              bookingDate: b.bookingDate,
              capacity: b.capacity,
              status: b.status,
              specialRequest: b.specialRequest,
              startTime: b.startTime,
              endTime: b.endTime || adjustEndTime(b.startTime, slotMinutes)
            }));
            setBookings(mappedBookings);
          }
        }

      } catch (error) {
        console.error("Error fetching timeline data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimelineData();
  }, [currentDate]);

  // --- Grid Calculations ---
  const numSlots = useMemo(() => {
    const start = parseTimeToMinutes(storeHours.start);
    const end = parseTimeToMinutes(storeHours.end);
    return Math.max(1, Math.floor((end - start) / slotMinutes));
  }, [storeHours]);

  const timeLabels = useMemo(() => {
    const start = parseTimeToMinutes(storeHours.start);
    return Array.from({ length: numSlots }, (_, idx) => {
      const minutes = start + idx * slotMinutes;
      return formatMinutesToTime(minutes);
    });
  }, [numSlots, storeHours]);

  const bookingsByTable = useMemo(() => {
    const map = new Map<number, Booking[]>();
    for (const table of tables) map.set(table.id, []);
    
    for (const b of bookings) {
      if (!map.has(b.tableId)) map.set(b.tableId, []);
      map.get(b.tableId)!.push(b);
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, c) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(c.startTime));
      map.set(k, v);
    }
    return map;
  }, [bookings, tables]);

  // --- Dynamic Layout Dimensions ---
  const timeColWidthPx = 100;
  const minSlotWidthPx = 100; 
  const minRowHeightPx = 108; 
  const headerHeightPx = 42;  

  // Calculate dynamic slot width (Horizontal)
  const availableTimelineWidth = containerWidth - timeColWidthPx;
  const stretchedSlotWidth = numSlots > 0 ? availableTimelineWidth / numSlots : minSlotWidthPx;
  const slotWidthPx = Math.max(minSlotWidthPx, stretchedSlotWidth);
  const timelineWidthPx = numSlots * slotWidthPx;

  // Calculate dynamic row height (Vertical)
  const availableTimelineHeight = containerHeight - headerHeightPx;
  const stretchedRowHeight = tables.length > 0 ? availableTimelineHeight / tables.length : minRowHeightPx;
  const rowHeightPx = Math.max(minRowHeightPx, stretchedRowHeight);

  // Interaction Handler
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col p-8 h-[calc(100vh-70px)] overflow-hidden">
      <div 
        ref={containerRef}
        className="bg-white border border-border rounded-lg overflow-hidden flex flex-col w-full shadow-sm relative h-full"
      >
        
        {/* Loading / Closed Overlays */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <span className="text-gray-500 font-medium">Loading timeline...</span>
          </div>
        )}
        
        {!isLoading && storeHours.isClosed && (
          <div className="absolute inset-0 bg-gray-50 z-40 flex items-center justify-center flex-col gap-2">
            <span className="text-xl font-bold text-gray-400">Restaurant Closed</span>
            <span className="text-sm text-gray-400">There are no operating hours for this date.</span>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <div style={{ width: timeColWidthPx + timelineWidthPx, minWidth: "100%" }}>
            
            {/* Header row */}
            <div className="flex sticky top-0 z-30 bg-gray-50 border-b border-gray-200 shadow-sm" style={{ height: headerHeightPx }}>
              <div
                className="px-4 py-3 text-xs font-semibold text-gray-500 flex-shrink-0 sticky left-0 z-40 bg-gray-50 border-r border-gray-200 justify-center flex items-center"
                style={{ width: timeColWidthPx }}
              >
                Table
              </div>
              <div className="flex flex-shrink-0 relative" style={{ width: timelineWidthPx }}>
                {timeLabels.map((label, idx) => (
                  <div
                    key={`${label}-${idx}`}
                    className="flex items-center justify-center border-r border-gray-200 text-[11px] font-medium text-gray-500 flex-shrink-0"
                    style={{ width: slotWidthPx }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Body rows */}
            {tables.map((table) => {
              const tableBookings = bookingsByTable.get(table.id) ?? [];
              const thisTableExceptions = tableExceptions.filter(e => e.tableId === table.id);
              
              return (
                <div
                  key={table.id}
                  className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors group relative"
                  style={{ height: rowHeightPx }}
                >
                  {/* Table Label */}
                  <div
                    className="px-4 flex items-center justify-center border-r border-gray-200 text-sm font-semibold text-gray-700 flex-shrink-0 sticky left-0 z-20 bg-white group-hover:bg-gray-50 transition-colors"
                    style={{ width: timeColWidthPx }}
                  >
                    {table.name}
                  </div>

                  {/* Timeline Slots */}
                  <div className="relative flex-shrink-0" style={{ width: timelineWidthPx }}>
                    
                    {/* Vertical Slot Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: numSlots }).map((_, slotIdx) => (
                        <div key={slotIdx} className="border-r border-gray-100 flex-shrink-0 h-full" style={{ width: slotWidthPx }} />
                      ))}
                    </div>

                    {/* 1. Render Exceptions (Behind bookings) */}
                    {showExceptions && thisTableExceptions.map((exc) => {
                      const startSlot = getSlotIndex(exc.exceptTimeFrom, storeHours.start, slotMinutes);
                      const endSlot = getSlotIndex(exc.exceptTimeTo, storeHours.start, slotMinutes);
                      const durationSlots = Math.max(1, endSlot - startSlot);

                      const leftPx = startSlot * slotWidthPx + 2; 
                      const widthPx = durationSlots * slotWidthPx - 4;

                      return (
                        <div
                          key={`exc-${exc.id}`}
                          className="absolute top-3 bottom-3 rounded-lg border border-gray-300 bg-gray-100 flex flex-col items-center justify-center shadow-sm z-0 overflow-hidden"
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                          }}
                          title={exc.description || "Table Exception"}
                        >
                          <span className="font-bold text-xs text-gray-text truncate block px-2 text-center w-full">
                            {exc.description || "Unavailable"}
                          </span>
                        </div>
                      );
                    })}

                    {/* 2. Render Booking cards (On top of exceptions) */}
                    {tableBookings.map((b) => {
                      const startSlot = getSlotIndex(b.startTime, storeHours.start, slotMinutes);
                      const endSlot = getSlotIndex(b.endTime, storeHours.start, slotMinutes);
                      
                      const durationSlots = Math.max(1, endSlot - startSlot);
                      const leftPx = startSlot * slotWidthPx + 2; 
                      const widthPx = durationSlots * slotWidthPx - 4;
                      const style = statusToStyle(b.status); // b.status is now safe to pass

                      return (
                        <div
                          key={b.id}
                          onClick={() => handleBookingClick(b)}
                          className="absolute top-3 bottom-3 rounded-lg border px-3 py-2 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-all z-10 overflow-hidden"
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text,
                          }}
                        >
                          <div className="font-semibold text-sm leading-5 truncate">{b.customerName}</div>
                          <div className="text-[11px] leading-4 opacity-90 truncate capitalize">
                            {b.capacity}p, {b.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        booking={selectedBooking} 
      />
    </div>
  );
}

// --- Helper Functions ---

function parseTimeToMinutes(time: string) {
  if (!time) return 0;
  const [hh, mm] = time.split(":").map((v) => Number(v));
  return hh * 60 + mm;
}

function formatMinutesToTime(totalMinutes: number) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function getSlotIndex(time: string, timelineStart: string, slotMinutes: number) {
  const t = parseTimeToMinutes(time);
  const start = parseTimeToMinutes(timelineStart);
  return (t - start) / slotMinutes; 
}

function adjustEndTime(startTime: string, durationMins: number) {
  const start = parseTimeToMinutes(startTime);
  return formatMinutesToTime(start + durationMins);
}

// Updated to accept 'string' to resolve TypeScript errors
function statusToStyle(status: string) {
  switch (status) {
    case "created": 
      return { bg: "var(--color-blue-light, #e0f2fe)", border: "var(--color-blue-stroke, #bae6fd)", text: "var(--color-blue-dark, #0369a1)" };
    case "success": 
      return { bg: "var(--color-green-light, #dcfce7)", border: "var(--color-green-stroke, #bbf7d0)", text: "var(--color-green-dark, #15803d)" };
    case "noshow":  
      return { bg: "var(--color-orange-light, #ffedd5)", border: "var(--color-orange-stroke, #fed7aa)", text: "var(--color-orange-dark, #c2410c)" };
    case "canceled":
      return { bg: "var(--color-red-light, #fee2e2)", border: "var(--color-red-stroke, #fecaca)", text: "var(--color-red-dark, #b91c1c)" };
    default:
      return { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" };
  }
}