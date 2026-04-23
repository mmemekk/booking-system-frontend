"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Close,
  PersonOutline,
  PhoneOutlined,
  CalendarTodayOutlined,
  AccessTimeOutlined,
  TableRestaurantOutlined,
  PeopleAltOutlined,
  ReceiptOutlined,
  StarOutline,
  EditOutlined,
} from "@mui/icons-material";
import { config } from "../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

export interface BookingDetails {
  bookingRef: string;
  tableName: number; // Note: Acts as tableId
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  capacity: number;
  specialRequest?: string;
  status: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetails | null;
  onSuccess?: () => void; // Call this to refresh parent data after edit
}

interface AvailabilitySlot {
  from: string;
  to: string;
}

interface TableAvailability {
  restaurantId: number;
  id: number;
  name: string;
  capacity: number;
  description: string | null;
  availabilities: AvailabilitySlot[];
}

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: BookingModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Form State
  const [editData, setEditData] = useState({
    customerName: "",
    customerPhone: "",
    bookingDate: "",
    startTime: "",
    capacity: 2,
    specialRequest: "",
    tableId: "",
    status: "",
  });

  // Table Availability State
  const [availableTables, setAvailableTables] = useState<TableAvailability[]>(
    [],
  );
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Table name mapping (tableId -> tableName)
  const [tableMap, setTableMap] = useState<Record<string, string>>({});

  // Reset modal state when opened or when booking changes
  useEffect(() => {
    if (isOpen && booking) {
      setIsEditing(false);
      setError(null);
      setEditData({
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        capacity: booking.capacity,
        specialRequest: booking.specialRequest || "",
        tableId: String(booking.tableName), // Maps to tableId
        status: booking.status,
      });
    }
  }, [isOpen, booking]);

  // Fetch table names mapping
  useEffect(() => {
    const fetchTableMap = async () => {
      try {
        const response = await fetch(
          `${baseUrl}/restaurant/${restaurantId}/table`,
        );
        if (response.ok) {
          const data = await response.json();
          const tables = data?.getTable || [];

          // Create a mapping of tableId -> tableName
          const map: Record<string, string> = {};
          tables.forEach((table: any) => {
            map[String(table.id)] = table.name || `Table ${table.id}`;
          });

          setTableMap(map);
        }
      } catch (err) {
        console.error("Error fetching table map:", err);
      }
    };

    fetchTableMap();
  }, []);

  // Fetch availability when in Edit Mode and date changes
  useEffect(() => {
    if (!isOpen || !isEditing || !editData.bookingDate) return;

    const fetchAvailability = async () => {
      setIsLoadingTables(true);
      try {
        const response = await fetch(
          `${baseUrl}/restaurant/${restaurantId}/availability?date=${editData.bookingDate}`,
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableTables(data.formattedGetAvailability || []);
        } else {
          setAvailableTables([]);
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
        setAvailableTables([]);
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchAvailability();
  }, [editData.bookingDate, isOpen, isEditing]);

  // Filter tables for Edit Mode
  const eligibleTables = useMemo(() => {
    return availableTables.filter((table) => {
      const meetsCapacity = table.capacity >= editData.capacity;
      const isAvailableAtTime = table.availabilities.some(
        (slot) => slot.from === editData.startTime,
      );

      // If it's the exact same time/date/table as original, it might not show as "available" because it's holding its own slot.
      // We force-include the currently assigned table so the user doesn't lose it if they are just editing the name/phone.
      const isCurrentTable =
        String(table.id) === String(booking?.tableName) &&
        editData.bookingDate === booking?.bookingDate &&
        editData.startTime === booking?.startTime;

      return (meetsCapacity && isAvailableAtTime) || isCurrentTable;
    });
  }, [
    availableTables,
    editData.capacity,
    editData.startTime,
    booking,
    editData.bookingDate,
  ]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "customerPhone") {
      setEditData((prev) => ({ ...prev, [name]: value.replace(/\D/g, "") }));
      return;
    }

    setEditData((prev) => ({
      ...prev,
      [name]: name === "capacity" ? Number(value) || "" : value,
    }));
  };

  // Enforce 15-min intervals
  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const timeVal = e.target.value;
    if (!timeVal) return;

    let [hours, minutes] = timeVal.split(":").map(Number);
    const roundedMinutes = Math.round(minutes / 15) * 15;

    if (roundedMinutes === 60) {
      minutes = 0;
      hours = (hours + 1) % 24;
    } else {
      minutes = roundedMinutes;
    }

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    setEditData((prev) => ({ ...prev, startTime: formattedTime }));
  };

  const handleSave = async () => {
    setError(null);
    if (
      !editData.customerName ||
      !editData.customerPhone ||
      !editData.bookingDate ||
      !editData.startTime ||
      !editData.capacity ||
      !editData.tableId
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `${baseUrl}/booking/${booking?.bookingRef}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: Number(editData.tableId),
            customerName: editData.customerName,
            customerPhone: editData.customerPhone,
            bookingDate: editData.bookingDate,
            startTime: editData.startTime,
            capacity: Number(editData.capacity),
            specialRequest: editData.specialRequest,
            status: editData.status,
          }),
        },
      );

      if (response.ok) {
        setIsEditing(false);
        if (onSuccess) onSuccess(); // Trigger parent refresh
        onClose(); // Close modal on success
      } else {
        const resData = await response.json();
        setError(resData.message || "Failed to update booking.");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      setError("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5 shrink-0 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Booking" : "Booking Details"}
          </h2>

          <div className="flex items-center gap-4">
            {!isEditing && (
              <span
                className={`text-[11px] leading-none font-bold px-3 py-1.5 rounded-full capitalize ${
                  booking.status === "success"
                    ? "bg-green-100 text-green-800"
                    : booking.status === "noshow"
                      ? "bg-orange-100 text-orange-800"
                      : booking.status === "created"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {booking.status}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <Close />
            </button>
          </div>
        </div>

        {/* Body Area (Scrollable) */}
        <div className="flex flex-col gap-6 px-8 py-6 overflow-y-auto">
          {error && isEditing && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Reference Badge (Always visible) */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-blue-700 w-fit shrink-0">
            <ReceiptOutlined sx={{ fontSize: 20 }} />
            <span className="text-sm font-bold tracking-wide">
              Ref: {booking.bookingRef}
            </span>
          </div>

          {/* ================= VIEW MODE ================= */}
          {!isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <PersonOutline sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Customer
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {booking.customerName}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <PhoneOutlined sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Contact
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {booking.customerPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <CalendarTodayOutlined sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Date
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {booking.bookingDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <AccessTimeOutlined sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Time
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {booking.startTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <TableRestaurantOutlined sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Table
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {tableMap[String(booking.tableName)] ||
                        `Table ${booking.tableName}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-gray-400">
                    <PeopleAltOutlined sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                      Guests
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {booking.capacity} People
                    </span>
                  </div>
                </div>
              </div>

              {booking.specialRequest && (
                <div className="mt-2 flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <div className="mt-0.5 text-orange-500">
                    <StarOutline sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">
                      Special Request
                    </span>
                    <span className="text-base font-medium text-orange-900">
                      {booking.specialRequest}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ================= EDIT MODE FORM ================= */
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={editData.customerName}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={editData.customerPhone}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    name="bookingDate"
                    value={editData.bookingDate}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                    Time
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    step="900"
                    value={editData.startTime}
                    onChange={handleChange}
                    onBlur={handleTimeBlur}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                    Guests
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    value={editData.capacity}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">
                    Assign Table
                  </label>
                  <select
                    name="tableId"
                    value={editData.tableId}
                    onChange={handleChange}
                    disabled={isLoadingTables || eligibleTables.length === 0}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100"
                  >
                    <option value="" disabled>
                      {isLoadingTables ? "Checking..." : "Select Table"}
                    </option>
                    {eligibleTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} (Cap: {table.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 tracking-wide">
                    Status
                  </label>
                  <select
                    name="status"
                    value={editData.status}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white capitalize"
                  >
                    <option value="created">Created</option>
                    <option value="success">Success / Seated</option>
                    <option value="noshow">No Show</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                  Special Request
                </label>
                <textarea
                  name="specialRequest"
                  value={editData.specialRequest}
                  onChange={handleChange}
                  rows={2}
                  className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-5 flex justify-end gap-3 shrink-0">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <EditOutlined fontSize="small" />
              Edit Booking
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editData.tableId}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:bg-blue-400"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
