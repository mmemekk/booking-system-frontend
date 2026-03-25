"use client";

import { useEffect, useMemo } from "react";
import { useTopBar } from "../../component/topbarContext";

export default function Bookings() {
  const { setTopBar } = useTopBar();

  useEffect(() => {
    setTopBar(
      "Bookings",
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Add Booking
        </button>
      </div>,
    );
  }, [setTopBar]);

  const timelineStart = "08:00";
  const timelineEnd = "18:30";
  const slotMinutes = 30;
  
  const numSlots = useMemo(() => {
    const start = parseTimeToMinutes(timelineStart);
    const end = parseTimeToMinutes(timelineEnd);
    return Math.floor((end - start) / slotMinutes);
  }, []);

  const timeLabels = useMemo(() => {
    const start = parseTimeToMinutes(timelineStart);
    return Array.from({ length: numSlots }, (_, idx) => {
      const minutes = start + idx * slotMinutes;
      return formatMinutesToTime(minutes);
    });
  }, [numSlots]);

  const mockBookings = useMemo<Booking[]>(() => {
    return [
      { id: "b1", tableId: 1, guestName: "Jane Doe", partySize: 4, status: "Booked", start: "08:30", end: "10:00" },
      { id: "b2", tableId: 2, guestName: "Alice Johnson", partySize: 6, status: "Arrived", start: "09:30", end: "11:00" },
      { id: "b3", tableId: 4, guestName: "Michael Brown", partySize: 2, status: "Booked", start: "10:00", end: "11:30" },
      { id: "b4", tableId: 5, guestName: "Emily Davis", partySize: 5, status: "Booked", start: "10:30", end: "13:00" },
      { id: "b5", tableId: 6, guestName: "David Wilson", partySize: 2, status: "Booked", start: "16:00", end: "17:00" },
      { id: "b6", tableId: 1, guestName: "John Smith", partySize: 2, status: "Seated", start: "14:00", end: "15:00" },
      { id: "b7", tableId: 4, guestName: "Chris Green", partySize: 3, status: "No-show", start: "17:00", end: "17:30" },
    ];
  }, []);

  const tables = useMemo(() => [1, 2, 3, 4, 5, 6,7,8,9,10,11,12], []);

  const bookingsByTable = useMemo(() => {
    const map = new Map<number, Booking[]>();
    for (const tableId of tables) map.set(tableId, []);
    for (const b of mockBookings) {
      if (!map.has(b.tableId)) map.set(b.tableId, []);
      map.get(b.tableId)!.push(b);
    }
    for (const [k, v] of map.entries()) {
      v.sort((a, c) => parseTimeToMinutes(a.start) - parseTimeToMinutes(c.start));
      map.set(k, v);
    }
    return map;
  }, [mockBookings, tables]);

  const rowHeightPx = 108;
  const timeColWidthPx = 100;
  const slotWidthPx = 100;
  const timelineWidthPx = numSlots * slotWidthPx;

  return (
    <div className="flex flex-col p-8 h-[calc(100vh-70px)] overflow-hidden">
      {/* Scrollable Timeline Container */}
      <div className="bg-white border border-border rounded-lg overflow-hidden flex flex-col w-full shadow-sm">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          {/* Inner wrapper sets the absolute width needed for the grid */}
          <div style={{ width: timeColWidthPx + timelineWidthPx, minWidth: "100%" }}>
            
            {/* Header row (Sticky to top) */}
            <div className="flex sticky top-0 z-30 bg-gray-50 border-b border-gray-200 shadow-sm">
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
            {tables.map((tableId) => {
              const bookings = bookingsByTable.get(tableId) ?? [];
              
              return (
                <div
                  key={tableId}
                  className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors group"
                  style={{ height: rowHeightPx }}
                >
                  {/* Table Label Column (Sticky to left) */}
                  <div
                    className="px-4 flex items-center justify-center border-r border-gray-200 text-sm font-semibold text-gray-700 flex-shrink-0 sticky left-0 z-20 bg-white group-hover:bg-gray-50 transition-colors"
                    style={{ width: timeColWidthPx }}
                  >
                    Table {tableId}
                  </div>

                  {/* Timeline Slots */}
                  <div className="relative flex-shrink-0" style={{ width: timelineWidthPx }}>
                    
                    {/* Vertical Slot Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: numSlots }).map((_, slotIdx) => (
                        <div key={slotIdx} className="border-r border-gray-100 flex-shrink-0" style={{ width: slotWidthPx }} />
                      ))}
                    </div>

                    {/* Booking cards */}
                    {bookings.map((b) => {
                      const startSlot = getSlotIndex(b.start, timelineStart, slotMinutes);
                      const endSlot = getSlotIndex(b.end, timelineStart, slotMinutes);
                      const durationSlots = Math.max(1, endSlot - startSlot);

                      const leftPx = startSlot * slotWidthPx + 2; 
                      const widthPx = durationSlots * slotWidthPx - 4;

                      const style = statusToStyle(b.status);
                      return (
                        <div
                          key={b.id}
                          className="absolute top-3 bottom-3 rounded-lg border px-3 py-2 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-[1px] transition-all z-10"
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text,
                          }}
                        >
                          <div className="font-semibold text-sm leading-5 truncate">{b.guestName}</div>
                          <div className="text-[11px] leading-4 opacity-90 truncate">
                            {b.partySize}p, {b.status}
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
    </div>
  );
}

type BookingStatus = "Booked" | "Arrived" | "Seated" | "No-show";

type Booking = {
  id: string;
  tableId: number;
  guestName: string;
  partySize: number;
  status: BookingStatus;
  start: string; 
  end: string; 
};

function parseTimeToMinutes(time: string) {
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
  return Math.floor((t - start) / slotMinutes + 1e-6);
}

function statusToStyle(status: BookingStatus) {
  switch (status) {
    case "Booked":
      return { bg: "var(--color-blue-light, #e0f2fe)", border: "var(--color-blue-stroke, #bae6fd)", text: "var(--color-blue-dark, #0369a1)" };
    case "Arrived":
      return { bg: "var(--color-orange-light, #ffedd5)", border: "var(--color-orange-stroke, #fed7aa)", text: "var(--color-orange-dark, #c2410c)" };
    case "Seated":
      return { bg: "var(--color-green-light, #dcfce7)", border: "var(--color-green-stroke, #bbf7d0)", text: "var(--color-green-dark, #15803d)" };
    case "No-show":
      return { bg: "var(--color-red-light, #fee2e2)", border: "var(--color-red-stroke, #fecaca)", text: "var(--color-red-dark, #b91c1c)" };
  }
}