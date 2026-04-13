"use client";

import { useState, useEffect, useMemo } from "react";
import { Close } from "@mui/icons-material";
import { config } from "../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback to refresh data in the parent component
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

export default function AddBookingModal({ isOpen, onClose, onSuccess }: AddBookingModalProps) {
  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    bookingDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    bookingTime: "12:00",
    capacity: 2,
    specialRequest: "",
    tableId: "",
  });

  const [availableTables, setAvailableTables] = useState<TableAvailability[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerName: "",
        customerPhone: "",
        bookingDate: new Date().toISOString().split("T")[0],
        bookingTime: "12:00",
        capacity: 2,
        specialRequest: "",
        tableId: "",
      });
      setError(null);
    }
  }, [isOpen]);

  // Fetch availability whenever the date changes
  useEffect(() => {
    if (!isOpen || !formData.bookingDate) return; 

    const fetchAvailability = async () => {
      setIsLoadingTables(true);
      try {
        const response = await fetch(`${baseUrl}/restaurant/${restaurantId}/availability?date=${formData.bookingDate}`);
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
  }, [formData.bookingDate, isOpen]);

  // Dynamically filter tables that meet BOTH capacity and time requirements
  const eligibleTables = useMemo(() => {
    return availableTables.filter((table) => {
      const meetsCapacity = table.capacity >= formData.capacity;
      const isAvailableAtTime = table.availabilities.some((slot) => slot.from === formData.bookingTime);
      return meetsCapacity && isAvailableAtTime;
    });
  }, [availableTables, formData.capacity, formData.bookingTime]);

  // Auto-clear selected table if it becomes invalid due to time/capacity changes
  useEffect(() => {
    if (formData.tableId && !eligibleTables.find(t => String(t.id) === String(formData.tableId))) {
      setFormData(prev => ({ ...prev, tableId: "" }));
    }
  }, [eligibleTables, formData.tableId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Specifically restrict the phone input to numbers only
    if (name === "customerPhone") {
      const numbersOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: numbersOnly,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "capacity" ? Number(value) || "" : value,
    }));
  };

  // --- Enforce 15-minute intervals if the user types manually ---
  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const timeVal = e.target.value;
    if (!timeVal) return;

    let [hours, minutes] = timeVal.split(":").map(Number);

    // Round to the nearest 15 minutes
    const roundedMinutes = Math.round(minutes / 15) * 15;

    if (roundedMinutes === 60) {
      minutes = 0;
      hours = (hours + 1) % 24; // Handle hour rollover
    } else {
      minutes = roundedMinutes;
    }

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    setFormData((prev) => ({
      ...prev,
      bookingTime: formattedTime,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.customerName || !formData.customerPhone || !formData.bookingDate || !formData.bookingTime || !formData.capacity || !formData.tableId) {
      setError("Please fill in all required fields, including selecting a table.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/booking/${restaurantId}/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          bookingDate: formData.bookingDate,
          bookingTime: formData.bookingTime,
          capacity: Number(formData.capacity),
          specialRequest: formData.specialRequest,
          tableId: Number(formData.tableId),
        }),
      });

      if (response.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const resData = await response.json();
        setError(resData.message || "Failed to create booking. Please try again.");
      }
    } catch (err) {
      console.error("Error creating manual booking:", err);
      setError("An error occurred. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Booking</h2>

          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <Close fontSize="small" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5  tracking-wide">Customer Name *</label>
              <input
                type="text"
                name="customerName"
                required
                value={formData.customerName}
                onChange={handleChange}
                placeholder="name"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Phone Number *</label>
              <input
                type="tel"
                name="customerPhone"
                required
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="phone"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="w-full h-px bg-gray-100" />

          {/* Date, Time, Capacity */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Date *</label>
              <input
                type="date"
                name="bookingDate"
                required
                value={formData.bookingDate}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5  tracking-wide">Time *</label>
              <input
                type="time"
                name="bookingTime"
                required
                step="900" // Browser UI hint for 15 min increments
                value={formData.bookingTime}
                onChange={handleChange}
                onBlur={handleTimeBlur} // Force snap to 15 mins on blur
                className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5  tracking-wide">Guests *</label>
              <input
                type="number"
                name="capacity"
                required
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Table Selection */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5  tracking-wide">
              Assign Table *
            </label>
            <select
              name="tableId"
              required
              value={formData.tableId}
              onChange={handleChange}
              disabled={isLoadingTables || eligibleTables.length === 0}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="" disabled>
                {isLoadingTables 
                  ? "Checking availability..." 
                  : eligibleTables.length === 0 
                    ? "No tables available for this time/party size" 
                    : "Select an available table"}
              </option>
              {eligibleTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} (Capacity: {table.capacity}) {table.description ? `- ${table.description}` : ""}
                </option>
              ))}
            </select>
            {!isLoadingTables && eligibleTables.length > 0 && (
              <p className="text-[11px] text-blue-600 mt-2 font-medium">
                {eligibleTables.length} table(s) match your time and capacity requirements.
              </p>
            )}
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Special Request <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
            <textarea
              name="specialRequest"
              value={formData.specialRequest}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Birthday, window seat, allergies..."
              className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.tableId}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? "Creating..." : "Create Booking"}
          </button>
        </div>

      </div>
    </div>
  );
}