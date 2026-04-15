"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../component/topbarContext";
import { config } from "../../config";

// ─── Config ───────────────────────────────────────────────────────────────────

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;
const BASE = `${baseUrl}/restaurant/${restaurantId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type DayOfWeek =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

const DAYS: DayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

interface TableAvailability {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isUseStoreHour: boolean;
}

interface TableException {
  id: number;
  date: string;
  exceptTimeFrom: string;
  exceptTimeTo: string;
  isClosed: boolean;
  description: string;
}

interface ApiTable {
  id: string | number;
  name: string;
  capacity: number;
  description: string;
  [key: string]: unknown;
}

interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  description: string;
  availability: TableAvailability[];
  exceptions: TableException[];
  isAvailable: boolean;
}

interface StoreHour {
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

// Booking shape matches bookings page (formattedBooking array)
interface Booking {
  id: string;
  bookingRef?: string;
  tableId: number;
  customerName: string;
  customerPhone?: string;
  bookingDate: string;
  capacity: number;
  status: string;
  specialRequest?: string;
  startTime: string;
  endTime: string;
}

// ─── API Layer ────────────────────────────────────────────────────────────────

async function apiGetTables(): Promise<ApiTable[]> {
  const res = await fetch(`${BASE}/table`);
  if (!res.ok) throw new Error(`GET /table → ${res.status}`);
  const data = await res.json();
  return data?.getTable ?? (Array.isArray(data) ? data : []);
}

async function apiCreateTable(body: {
  name: string;
  capacity: number;
  description: string;
}): Promise<ApiTable> {
  const res = await fetch(`${BASE}/table`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /table → ${res.status}`);
  const data = await res.json();
  console.log("[apiCreateTable] raw response:", data);
  return data?.createdTable ?? data?.createTable ?? data;
}

async function apiUpdateTable(
  tableId: string,
  body: { name: string; capacity: number; description: string }
): Promise<void> {
  const res = await fetch(`${BASE}/table/${tableId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /table/${tableId} → ${res.status}`);
}

async function apiDeleteTable(tableId: string): Promise<void> {
  const res = await fetch(`${BASE}/table/${tableId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /table/${tableId} → ${res.status}`);
}

async function apiGetTableAvailability(tableId: string): Promise<TableAvailability[]> {
  const res = await fetch(`${BASE}/table/${tableId}/availability`);
  if (!res.ok) { console.warn(`[availability] table ${tableId} fetch failed:`, res.status); return []; }
  const data = await res.json();
  console.log(`[availability] table ${tableId} raw:`, JSON.stringify(data));
  const result = Array.isArray(data) ? data : (data?.availability ?? data?.tableAvailability ?? []);
  console.log(`[availability] table ${tableId} parsed:`, result.length, "entries", result);
  return result;
}

async function apiSetTableAvailability(tableId: string, day: DayOfWeek): Promise<void> {
  const res = await fetch(`${BASE}/table/${tableId}/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dayOfWeek: day,
      openTime: "10:00",
      closeTime: "21:00",
      isUseStoreHour: true,
    }),
  });
  if (!res.ok) throw new Error(`POST availability/${day} → ${res.status}`);
}

async function apiGetTableExceptions(tableId: string): Promise<TableException[]> {
  const res = await fetch(`${BASE}/table/${tableId}/exception?upcoming=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.exceptions ?? []);
}

// Exactly matches bookings page fetch pattern
async function apiGetBookingsByDate(dateStr: string): Promise<Booking[]> {
  const res = await fetch(`${baseUrl}/booking/${restaurantId}?bookingDate=${dateStr}`);
  if (!res.ok && res.status !== 404) return [];
  if (res.status === 404) return [];
  const data = await res.json();
  const slotMinutes = Number(config.slot) || 30;
  // Use formattedBooking exactly as bookings page does
  return (data?.formattedBooking ?? []).map((b: any) => ({
    id: String(b.id),
    bookingRef: b.bookingRef,
    tableId: b.tableId,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    bookingDate: b.bookingDate,
    capacity: b.capacity,
    status: b.status,
    specialRequest: b.specialRequest,
    startTime: b.startTime,
    endTime: b.endTime || adjustEndTime(b.startTime, slotMinutes),
  }));
}

async function apiGetStoreHour(): Promise<StoreHour> {
  const today = new Date();
  const queryDate = fmtDate(today);
  const res = await fetch(`${BASE}/availability/store-hour/?date=${queryDate}`);
  if (!res.ok) return { isClosed: false, openTime: "00:00", closeTime: "23:59" };
  const data = await res.json();
  const isClosed = data?.formattedGetEffectiveStoreHour?.isClosed ?? false;
  const times = data?.formattedGetEffectiveStoreHour?.openCloseTimes ?? [];
  if (isClosed || times.length === 0) return { isClosed, openTime: "00:00", closeTime: "23:59" };
  const openTime = times.reduce(
    (min: string, t: any) => (t.openTime < min ? t.openTime : min),
    times[0].openTime
  );
  const closeTime = times.reduce(
    (max: string, t: any) => (t.closeTime > max ? t.closeTime : max),
    times[0].closeTime
  );
  console.log("[storeHour]", { isClosed, openTime, closeTime });
  return { isClosed, openTime, closeTime };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function parseTimeToMinutes(time: string): number {
  if (!time) return 0;
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function adjustEndTime(startTime: string, durationMins: number): string {
  const start = parseTimeToMinutes(startTime);
  const total = start + durationMins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getNext7Days(): string[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return fmtDate(d);
  });
}

function toMins(time: string): number {
  const [h, m] = (time ?? "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
}

function computeIsAvailable(availability: TableAvailability[], storeHour: StoreHour): boolean {
  if (!availability?.length) {
    console.log("[isAvailable] ❌ no availability data");
    return false;
  }
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek;
  const todayAvail = availability.find((a) => a.dayOfWeek === dayName);
  console.log("[isAvailable] day:", dayName, "nowMins:", nowMins, "todayAvail:", todayAvail, "storeHour:", storeHour);
  if (!todayAvail) {
    console.log("[isAvailable] ❌ no entry for", dayName);
    return false;
  }
  if (todayAvail.isUseStoreHour) {
    if (storeHour.isClosed) { console.log("[isAvailable] ❌ store is closed"); return false; }
    const result = nowMins >= toMins(storeHour.openTime) && nowMins < toMins(storeHour.closeTime);
    console.log(`[isAvailable] useStoreHour → ${result} (${storeHour.openTime}–${storeHour.closeTime}, now=${nowMins})`);
    return result;
  }
  const result = nowMins >= toMins(todayAvail.openTime) && nowMins < toMins(todayAvail.closeTime);
  console.log(`[isAvailable] custom hours → ${result} (${todayAvail.openTime}–${todayAvail.closeTime}, now=${nowMins})`);
  return result;
}

function toUiTable(
  api: ApiTable,
  availability: TableAvailability[],
  exceptions: TableException[],
  storeHour: StoreHour
): RestaurantTable {
  return {
    id: String(api.id),
    name: api.name,
    capacity: api.capacity,
    description: api.description ?? "",
    availability,
    exceptions,
    isAvailable: computeIsAvailable(availability, storeHour),
  };
}

// Same as bookings page statusToStyle
function statusToStyle(status: string) {
  switch (status) {
    case "created":
      return {
        bg: "var(--color-blue-light)",
        border: "var(--color-blue-stroke)",
        text: "var(--color-blue-dark)",
        badge: "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
      };
    case "success":
      return {
        bg: "var(--color-green-light)",
        border: "var(--color-green-stroke)",
        text: "var(--color-green-dark)",
        badge: "bg-[var(--color-green-light)] text-[var(--color-green-dark)]",
      };
    case "noshow":
      return {
        bg: "var(--color-orange-light)",
        border: "var(--color-orange-stroke)",
        text: "var(--color-orange-dark)",
        badge: "bg-[var(--color-orange-light)] text-[var(--color-orange-dark)]",
      };
    case "canceled":
    case "cancelled":
      return {
        bg: "var(--color-red-light)",
        border: "var(--color-red-stroke)",
        text: "var(--color-red-dark)",
        badge: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
      };
    default:
      return {
        bg: "#f3f4f6",
        border: "#e5e7eb",
        text: "#374151",
        badge: "bg-gray-100 text-gray-600",
      };
  }
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${available
        ? "bg-[var(--color-green-light)] text-[var(--color-green-dark)]"
        : "bg-[var(--color-red-light)] text-[var(--color-red-dark)]"
        }`}
    >
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

// ─── TableModal ───────────────────────────────────────────────────────────────

interface TableModalProps {
  mode: "add" | "edit";
  initial?: Partial<RestaurantTable>;
  onClose: () => void;
  onSave: (data: { name: string; capacity: number; description: string }) => Promise<void>;
  loading: boolean;
}

function TableModal({ mode, initial, onClose, onSave, loading }: TableModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity ?? 2);
  const [description, setDescription] = useState(initial?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), capacity, description: description.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-grey-heading)]">
            {mode === "add" ? "Add New Table" : "Edit Table"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-grey-muted)] hover:bg-[var(--color-border)] transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-grey-text)] mb-1.5">Table Name / Number</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A3" required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-grey-heading)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue)] focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-grey-text)] mb-1.5">Capacity (Seats)</label>
            <input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-grey-heading)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue)] focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-grey-text)] mb-1.5">
              Description <span className="font-normal text-[var(--color-grey-muted)]">(optional)</span>
            </label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. front door, kitchen door"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-grey-heading)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-blue)] focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-grey-text)] hover:bg-[var(--color-page)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity" style={{ background: "var(--color-blue)" }}>
              {loading ? "Saving…" : mode === "add" ? "Add Table" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)] animate-pulse" style={{ background: "var(--color-surface)" }}>
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1 mr-3">
          <div className="h-3.5 rounded bg-[var(--color-border)] w-24" />
          <div className="h-3 rounded bg-[var(--color-border)] w-36" />
        </div>
        <div className="h-5 w-20 rounded-full bg-[var(--color-border)]" />
      </div>
    </div>
  );
}

// ─── BookingsPanel ────────────────────────────────────────────────────────────

interface BookingsPanelProps {
  table: RestaurantTable;
}

function BookingsPanel({ table }: BookingsPanelProps) {
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking[]>>({});
  const [loading, setLoading] = useState(true);

  const next7Days = getNext7Days();
  const today = fmtDate(new Date());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBookingsByDate({});

    async function fetchAll() {
      try {
        const results = await Promise.all(
          next7Days.map(async (dateStr) => {
            const all = await apiGetBookingsByDate(dateStr);
            // Filter to this table only — tableId matches
            const forTable = all.filter((b) => String(b.tableId) === table.id);
            return { dateStr, bookings: forTable };
          })
        );
        if (!cancelled) {
          const map: Record<string, Booking[]> = {};
          results.forEach(({ dateStr, bookings }) => { map[dateStr] = bookings; });
          setBookingsByDate(map);
        }
      } catch {
        // show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [table.id]);

  const totalBookings = Object.values(bookingsByDate).flat().length;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">

      {/* Table info header */}
      <div
        className="px-8 py-5 border-b border-[var(--color-border)] flex-shrink-0"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-bold text-[var(--color-grey-heading)]">{table.name}</h2>
        </div>
        <p className="text-sm text-[var(--color-grey-muted)]">
          {table.capacity} {table.capacity === 1 ? "Seat" : "Seats"}
          {table.description ? ` • ${table.description}` : ""}
        </p>
        {table.exceptions.length > 0 && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-orange-dark)" }}>
            ⚠ {table.exceptions.length} upcoming exception{table.exceptions.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Bookings section header */}
      <div
        className="px-8 py-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0"
        style={{ background: "var(--color-surface)" }}
      >
        <h3 className="font-semibold text-[var(--color-grey-heading)]">
          Upcoming Bookings
          <span className="ml-2 text-sm font-normal text-[var(--color-grey-muted)]">next 5 days</span>
        </h3>
        {!loading && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "var(--color-blue-light)", color: "var(--color-blue-dark)" }}
          >
            {totalBookings} total
          </span>
        )}
      </div>

      {/* Scrollable bookings list */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-[var(--color-page)]">
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {next7Days.map((d) => (
              <div key={d} className="animate-pulse space-y-3">
                <div className="h-3.5 bg-[var(--color-border)] rounded w-32" />
                <div className="h-20 bg-[var(--color-border)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {next7Days.map((dateStr) => {
              const dayBookings = bookingsByDate[dateStr] ?? [];
              const isToday = dateStr === today;

              return (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`text-xs font-bold px-3 py-1 rounded-full ${isToday
                        ? "text-white"
                        : "text-[var(--color-grey-muted)] bg-[var(--color-border)]"
                        }`}
                      style={isToday ? { background: "var(--color-blue)" } : {}}
                    >
                      {isToday ? "Today" : fmtDateLabel(dateStr)}
                    </div>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <span className="text-xs text-[var(--color-grey-muted)]">
                      {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Bookings for this day */}
                  {dayBookings.length === 0 ? (
                    <div
                      className="py-4 rounded-xl text-center text-sm"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px dashed var(--color-border)",
                        color: "var(--color-grey-muted)",
                      }}
                    >
                      No bookings for this day
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {dayBookings
                        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))
                        .map((booking) => {
                          const style = statusToStyle(booking.status);
                          return (
                            <div
                              key={booking.id}
                              className="rounded-xl px-5 py-4 flex items-start justify-between gap-4"
                              style={{
                                background: style.bg,
                                border: `1px solid ${style.border}`,
                              }}
                            >
                              {/* Left: customer info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm" style={{ color: style.text }}>
                                    {booking.customerName}
                                  </span>
                                  {booking.bookingRef && (
                                    <span className="text-xs opacity-60" style={{ color: style.text }}>
                                      #{booking.bookingRef}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="text-xs flex items-center gap-1" style={{ color: style.text, opacity: 0.8 }}>
                                    🕐 {booking.startTime} – {booking.endTime}
                                  </span>
                                  <span className="text-xs flex items-center gap-1" style={{ color: style.text, opacity: 0.8 }}>
                                    👥 {booking.capacity} {booking.capacity === 1 ? "guest" : "guests"}
                                  </span>
                                  {booking.customerPhone && (
                                    <span className="text-xs" style={{ color: style.text, opacity: 0.8 }}>
                                      📞 {booking.customerPhone}
                                    </span>
                                  )}
                                </div>
                                {booking.specialRequest && (
                                  <p className="text-xs mt-1.5 italic opacity-70" style={{ color: style.text }}>
                                    "{booking.specialRequest}"
                                  </p>
                                )}
                              </div>

                              {/* Right: status badge */}
                              <span
                                className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0"
                                style={{ background: "rgba(0,0,0,0.08)", color: style.text }}
                              >
                                {booking.status}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TablePage() {
  const { setTopBar } = useTopBar();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [storeHour, setStoreHour] = useState<StoreHour>({ isClosed: false, openTime: "00:00", closeTime: "23:59" });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; tableId?: string }>({ open: false, mode: "add" });
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setTopBar("Tables", null);
  }, [setTopBar]);

  // ── Load tables ───────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [fetchedStoreHour, apiTables] = await Promise.all([
          apiGetStoreHour().catch(() => ({ isClosed: false, openTime: "00:00", closeTime: "23:59" })),
          apiGetTables(),
        ]);

        if (!cancelled) setStoreHour(fetchedStoreHour);

        const uiTables = await Promise.all(
          apiTables.map(async (t) => {
            const tableId = String(t.id);
            const [availability, exceptions] = await Promise.all([
              apiGetTableAvailability(tableId).catch(() => [] as TableAvailability[]),
              apiGetTableExceptions(tableId).catch(() => [] as TableException[]),
            ]);
            return toUiTable(t, availability, exceptions, fetchedStoreHour);
          })
        );

        if (!cancelled) setTables(uiTables);
      } catch (err) {
        if (!cancelled)
          setFetchError(err instanceof Error ? err.message : "Could not load tables.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Add ───────────────────────────────────────────────────────────────────

  async function handleAdd(data: { name: string; capacity: number; description: string }) {
    setModalLoading(true);
    try {
      const created = await apiCreateTable(data);
      const rawId = created?.id ?? (created as any)?.tableId;
      if (rawId === undefined || rawId === null)
        throw new Error(`API did not return a table ID. Response: ${JSON.stringify(created)}`);
      const newId = String(rawId);

      for (const day of DAYS) {
        try { await apiSetTableAvailability(newId, day); }
        catch (err) { console.warn(`availability failed for ${day}:`, err); }
      }

      const [availability, exceptions] = await Promise.all([
        apiGetTableAvailability(newId).catch(() => [] as TableAvailability[]),
        apiGetTableExceptions(newId).catch(() => [] as TableException[]),
      ]);

      const newTable = toUiTable({ ...created, id: newId }, availability, exceptions, storeHour);
      setTables((prev) => [...prev, newTable]);
      setModal({ open: false, mode: "add" });
      showToast(`Table "${data.name}" added successfully`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add table", "error");
    } finally {
      setModalLoading(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  async function handleEdit(data: { name: string; capacity: number; description: string }) {
    if (!modal.tableId) return;
    setModalLoading(true);
    try {
      await apiUpdateTable(modal.tableId, data);
      setTables((prev) =>
        prev.map((t) =>
          t.id === modal.tableId
            ? { ...t, ...data, isAvailable: computeIsAvailable(t.availability, storeHour) }
            : t
        )
      );
      setModal({ open: false, mode: "edit" });
      showToast("Table updated");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update table", "error");
    } finally {
      setModalLoading(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await apiDeleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast("Table removed");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove table", "error");
    }
  }

  const selectedTable = selectedId ? tables.find((t) => t.id === selectedId) ?? null : null;
  const editingTable = modal.tableId ? tables.find((t) => t.id === modal.tableId) : undefined;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-[var(--color-page)]">

      {/* ── Left: Table list (fixed width) ── */}
      <div
        className="flex flex-col border-r border-[var(--color-border)] flex-shrink-0"
        style={{ width: 320, background: "var(--color-surface)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-grey-heading)]">Tables</h2>
          {!isLoading && (
            <span className="text-xs text-[var(--color-grey-muted)]">
              {tables.length} table{tables.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Error */}
        {fetchError && (
          <div className="mx-4 mb-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--color-red-light)", color: "var(--color-red-dark)", border: "1px solid var(--color-red-stroke)" }}>
            {fetchError}
            <button className="block mt-1 text-xs underline opacity-80" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* List — scrollable, flex-1 so it fills space between header and button */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : tables.map((table) => {
              const active = selectedId === table.id;
              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedId(active ? null : table.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${active
                    ? "border-[var(--color-blue)] shadow-sm"
                    : "border-[var(--color-border)] hover:border-[var(--color-blue-stroke)]"
                    }`}
                  style={{ background: active ? "var(--color-blue-light)" : "var(--color-surface)" }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate"
                        style={{ color: active ? "var(--color-blue-dark)" : "var(--color-grey-heading)" }}>
                        {table.name}
                      </h3>
                      <p className="text-xs text-[var(--color-grey-muted)] mt-0.5">
                        {table.capacity} {table.capacity === 1 ? "Seat" : "Seats"}
                        {table.description ? ` • ${table.description}` : ""}
                      </p>
                    </div>
                  </div>

                  {active && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal({ open: true, mode: "edit", tableId: table.id }); }}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--color-blue)", color: "#fff" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(table.id); }}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--color-red-light)", color: "var(--color-red-dark)" }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Add button — flex-shrink-0 keeps it always visible below the list */}
        <div
          className="flex-shrink-0 px-4 py-4"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => setModal({ open: true, mode: "add" })}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--color-blue)" }}
          >
            <span className="text-lg leading-none">＋</span>
            Add More Table
          </button>
        </div>
      </div>

      {/* ── Right: Bookings panel or empty state ── */}
      <div className="flex-1 flex overflow-hidden">
        {selectedTable ? (
          <BookingsPanel key={selectedTable.id} table={selectedTable} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "var(--color-grey-muted)" }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: "var(--color-border)" }}>
              🍽
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: "var(--color-grey-text)" }}>Select a table</p>
              <p className="text-sm mt-1">Click a table to view its upcoming bookings</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <TableModal
          mode={modal.mode}
          initial={editingTable}
          onClose={() => setModal({ open: false, mode: "add" })}
          onSave={modal.mode === "add" ? handleAdd : handleEdit}
          loading={modalLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl z-50 ${toast.type === "success" ? "bg-[var(--color-green-dark)]" : "bg-[var(--color-red-dark)]"
          }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}