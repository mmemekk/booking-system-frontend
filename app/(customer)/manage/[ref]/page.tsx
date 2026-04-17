// app/(customer)/manage/[ref]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  CalendarTodayOutlined,
  AccessTimeOutlined,
  PeopleAltOutlined,
  RestaurantOutlined,
  StarOutline,
  CheckCircleOutline,
  CancelOutlined,
} from "@mui/icons-material";
import { config } from "../../../../config"; // Adjust path to your config

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

export default function ManageBookingPage() {
  const params = useParams();
  const bookingRef = params.ref as string;

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit & UI State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [editData, setEditData] = useState({
    bookingDate: "",
    startTime: "",
    capacity: 2 as number | "", // Allow empty string to fix the leading zero issue
    specialRequest: "",
  });

  // Availability State
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // 1. Fetch Initial Booking Details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`${baseUrl}/booking/${restaurantId}?bookingRef=${bookingRef}`);
        if (response.ok) {
          const data = await response.json();
          const foundBooking = data.formattedBooking?.[0]; // Get the specific booking
          
          if (foundBooking) {
            setBooking(foundBooking);
            setEditData({
              bookingDate: foundBooking.bookingDate,
              startTime: foundBooking.startTime,
              capacity: foundBooking.capacity,
              specialRequest: foundBooking.specialRequest || "",
            });
          } else {
            setError("Booking not found.");
          }
        } else {
          setError("Booking not found or invalid link.");
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Unable to connect. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookingRef) fetchBooking();
  }, [bookingRef]);

  // 2. Fetch Availability when Date Changes in Edit Mode
  useEffect(() => {
    if (!isEditing || !editData.bookingDate) return;

    const fetchAvailability = async () => {
      setIsLoadingTables(true);
      try {
        const response = await fetch(`${baseUrl}/restaurant/${restaurantId}/availability?date=${editData.bookingDate}`);
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
  }, [editData.bookingDate, isEditing]);

  // 3. Background Table Assignment Logic
  const assignedTable = useMemo(() => {
    // Wait until there is a valid capacity typed in
    if (editData.capacity === "" || editData.capacity < 1) return null;

    return availableTables.find((table) => {
      // Rule 1: Capacity must be large enough, but not exceed requested capacity + 4
      const meetsCapacity = table.capacity >= editData.capacity && table.capacity <= Number(editData.capacity) + 4;
      
      // Rule 2: Table must be available at the requested time
      const isAvailableAtTime = table.availabilities?.some((slot: any) => slot.from === editData.startTime);
      
      // Rule 3: Ensure the user's CURRENT table is always valid if they haven't changed the date/time
      const isCurrentTable = 
        String(table.id) === String(booking?.tableId) && 
        editData.bookingDate === booking?.bookingDate &&
        editData.startTime === booking?.startTime &&
        meetsCapacity; // Still check capacity in case they increased party size

      return (meetsCapacity && isAvailableAtTime) || isCurrentTable;
    });
  }, [availableTables, editData.capacity, editData.startTime, booking]);

  // --- Handlers ---
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

  const confirmCancelBooking = async () => {
    setIsCancelModalOpen(false); // Close the modal
    
    try {
      const response = await fetch(`${baseUrl}/booking/${bookingRef}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "canceled" }),
      });

      if (response.ok) {
        setBooking((prev: any) => ({ ...prev, status: "canceled" }));
      } else {
        alert("Failed to cancel booking. Please call the restaurant.");
      }
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTable || editData.capacity === "" || editData.capacity < 1) return;

    setIsSaving(true);

    // Calculate a rough end time (+1 hour 30 mins from start time) just in case the API requires it
    const [h, m] = editData.startTime.split(":").map(Number);
    const endH = (h + 1) % 24;
    const endM = (m + 30) % 60;
    const calculatedEndTime = `${String(endH + (m + 30 >= 60 ? 1 : 0)).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    try {
      const response = await fetch(`${baseUrl}/booking/${bookingRef}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: Number(assignedTable.id), // Send the auto-assigned table!
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          bookingDate: editData.bookingDate,
          startTime: editData.startTime,
          endTime: calculatedEndTime,
          capacity: Number(editData.capacity),
          specialRequest: editData.specialRequest,
          status: booking.status,
        }),
      });

      if (response.ok) {
        // Update local state to reflect changes and close edit mode
        setBooking((prev: any) => ({
          ...prev,
          bookingDate: editData.bookingDate,
          startTime: editData.startTime,
          capacity: editData.capacity,
          specialRequest: editData.specialRequest,
          tableId: assignedTable.id,
        }));
        setIsEditing(false);
        setSuccessMessage("Your reservation has been successfully updated!");
        
        // Auto-hide the success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
        
      } else {
        alert("Failed to modify booking. Please try again.");
      }
    } catch (err) {
      console.error("Error modifying booking:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Renders ---
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="text-gray-500 font-medium">Loading your reservation...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
          <CancelOutlined sx={{ fontSize: 48 }} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // CANCELED STATE
  if (booking.status === "canceled") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden mt-8 border border-gray-100">
          <div className="bg-red-500 p-8 text-center text-white flex flex-col items-center">
            <CancelOutlined sx={{ fontSize: 56 }} className="mb-3 opacity-90" />
            <h1 className="text-2xl font-bold">Reservation Canceled</h1>
          </div>
          <div className="p-6 text-center flex flex-col gap-4">
            <p className="text-gray-600">
              Hi {booking.customerName}, your reservation for <strong>{booking.bookingDate}</strong> has been successfully canceled.
            </p>
            <p className="text-sm text-gray-500">We hope to serve you another time!</p>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE BOOKING STATE
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 relative">
      
      {/* Custom Cancellation Modal Overlay */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CancelOutlined fontSize="large" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Reservation?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to cancel your booking? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsCancelModalOpen(false)} 
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                No, Keep It
              </button>
              <button 
                onClick={confirmCancelBooking} 
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mt-4 sm:mt-8 border border-gray-100">
        
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center text-white flex flex-col items-center relative">
          <RestaurantOutlined sx={{ fontSize: 48 }} className="mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Your Reservation</h1>
          <p className="text-blue-100 font-medium mt-1 opacity-90">Ref: {booking.bookingRef}</p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          
          {/* Success Banner */}
          {successMessage && !isEditing && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4">
              <CheckCircleOutline fontSize="small" />
              {successMessage}
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 text-center">
            Hi, {booking.customerName}
          </h2>

          {!isEditing ? (
            /* --- VIEW MODE --- */
            <>
              <div className="flex flex-col gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-4 text-gray-700">
                  <CalendarTodayOutlined className="text-blue-600" />
                  <span className="font-semibold text-lg">{booking.bookingDate}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-700">
                  <AccessTimeOutlined className="text-blue-600" />
                  <span className="font-semibold text-lg">{booking.startTime}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-700">
                  <PeopleAltOutlined className="text-blue-600" />
                  <span className="font-semibold text-lg">{booking.capacity} People</span>
                </div>
              </div>

              {booking.specialRequest && (
                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <StarOutline className="text-gray-500 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-gray-500 mb-1">Special Request</span>
                    <span className="text-sm font-medium text-gray-800">{booking.specialRequest}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-4">
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setSuccessMessage(null); // Clear success message if they re-enter edit mode
                  }}
                  className="w-full py-3.5 font-bold rounded-xl transition-colors border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                >
                  Modify Reservation
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-3.5 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 transition-colors"
                >
                  Cancel Reservation
                </button>
              </div>
            </>
          ) : (
            /* --- EDIT MODE --- */
            <form onSubmit={handleSaveChanges} className="flex flex-col gap-5 animate-in fade-in duration-300">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={editData.bookingDate}
                    onChange={(e) => setEditData({ ...editData, bookingDate: e.target.value })}
                    className="w-full h-12 px-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Time</label>
                  <input
                    type="time"
                    required
                    step="900"
                    value={editData.startTime}
                    onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                    onBlur={handleTimeBlur}
                    className="w-full h-12 px-3 rounded-xl border border-gray-300 text-base bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Party Size</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editData.capacity}
                  onChange={(e) => setEditData({ ...editData, capacity: e.target.value === "" ? "" : Number(e.target.value) })}
                  className={`w-full h-12 px-3 rounded-xl border text-base bg-white focus:outline-none focus:ring-1 transition-colors ${
                    editData.capacity !== "" && editData.capacity < 1 
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {editData.capacity !== "" && editData.capacity < 1 && (
                  <p className="text-[11px] text-red-500 mt-1.5 font-bold">Party size must be at least 1.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Special Requests</label>
                <textarea
                  rows={2}
                  value={editData.specialRequest}
                  onChange={(e) => setEditData({ ...editData, specialRequest: e.target.value })}
                  placeholder="Allergies, high chair, etc."
                  className="w-full p-3 rounded-xl border border-gray-300 text-base resize-none bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Availability Status Message */}
              <div className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${
                isLoadingTables ? "bg-gray-50 border-gray-200 text-gray-500" :
                assignedTable ? "bg-green-50 border-green-200 text-green-700" : 
                "bg-red-50 border-red-200 text-red-600"
              }`}>
                {isLoadingTables ? "Checking availability..." : 
                 assignedTable ? <><CheckCircleOutline fontSize="small" /> Time slot available!</> : 
                 <><CancelOutlined fontSize="small" /> No tables available for this time/party size.</>}
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  disabled={isSaving || !assignedTable || isLoadingTables || editData.capacity === "" || editData.capacity < 1}
                  className="w-full py-3.5 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Revert edit data back to original booking
                    setEditData({
                      bookingDate: booking.bookingDate,
                      startTime: booking.startTime,
                      capacity: booking.capacity,
                      specialRequest: booking.specialRequest || "",
                    });
                  }}
                  disabled={isSaving}
                  className="w-full py-3.5 text-gray-600 font-bold bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Go Back
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}