"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../component/topbarContext";
import { PeopleAlt, TableRestaurantOutlined, Check, Close, Undo, Star } from "@mui/icons-material";
import BookingModal, { BookingDetails } from "../../component/bookingModal";
import DateSelector from "../../component/dateSelector";
import AddBookingModal from "../../component/addBookingModal";
import { config } from "../../config";

// Extended interface to handle the detail view and status
interface Booking extends BookingDetails {
  id: string;
  status: string; // Added status field
  isCurrent?: boolean;
}

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;
const slot = config.slot;

// Helper function to convert HH:MM to total minutes for calculation
const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export default function Dashboard() {
  const { setTopBar } = useTopBar();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State to trigger data refreshes across all useEffects
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Track which booking has the cancel/noshow menu open
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // State for Table Utilization Metric
  const [metric2Data, setMetric2Data] = useState({ bookedSlots: 0, totalStoreSlots: 0, percentage: 0 });

  // Top bar configuration
  useEffect(() => {
    setTopBar(
      "Dashboard",
      <div className="flex gap-4 items-center">
        <DateSelector 
          selectedDate={currentDate} 
          onChange={(newDate) => setCurrentDate(newDate)} 
        />
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
        >
          Add Booking
        </button>
      </div>,
    );
  }, [setTopBar, currentDate]);

  // Fetch Bookings Data
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const queryDate = `${year}-${month}-${day}`;

        const response = await fetch(`${baseUrl}/booking/${restaurantId}?bookingDate=${queryDate}`);
        
        // Graceful 404 handling
        if (response.status === 404) {
          setBookings([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.formattedBooking) {
            setBookings([]);
            return;
        }

        const mappedBookings: Booking[] = data.formattedBooking.map((b: any) => ({
          id: String(b.id),
          bookingRef: b.bookingRef,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          capacity: b.capacity,
          tableName: b.tableId, 
          specialRequest: b.specialRequest,
          status: b.status 
        }));

        setBookings(mappedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        setBookings([]); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  // Add refreshTrigger to dependencies
  }, [currentDate, refreshTrigger]);

  // Fetch Table Utilization Data
  useEffect(() => {
    const fetchUtilization = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const queryDate = `${year}-${month}-${day}`;

        const [storeHourRes, tablesRes, tableAvailRes] = await Promise.all([
          fetch(`${baseUrl}/restaurant/${restaurantId}/availability/store-hour/?date=${queryDate}`),
          fetch(`${baseUrl}/restaurant/${restaurantId}/table`),
          fetch(`${baseUrl}/restaurant/${restaurantId}/availability/table/?date=${queryDate}`)
        ]);

        let totalStoreMinutes = 0;
        let numTables = 0;
        let totalFreeMinutes = 0;

        if (storeHourRes.ok) {
          const storeHourData = await storeHourRes.json();
          const isClosed = storeHourData?.formattedGetEffectiveStoreHour?.isClosed;
          
          if (!isClosed) {
            const openCloseTimes = storeHourData?.formattedGetEffectiveStoreHour?.openCloseTimes || [];
            openCloseTimes.forEach((t: any) => {
              totalStoreMinutes += timeToMinutes(t.closeTime) - timeToMinutes(t.openTime);
            });
          }
        }

        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          numTables = tablesData?.getTable?.length || 0;
        }

        if (tableAvailRes.ok) {
          const tableAvailData = await tableAvailRes.json();
          const availabilities = tableAvailData?.formattedGetEffectiveTableAvailability || [];
          
          availabilities.forEach((table: any) => {
            if (table.availabilities) {
              table.availabilities.forEach((chunk: any) => {
                totalFreeMinutes += timeToMinutes(chunk.closeTime) - timeToMinutes(chunk.openTime);
              });
            }
          });
        }

        const slotDuration = Number(slot) || 30; 
        const totalStoreSlots = Math.floor((totalStoreMinutes / slotDuration) * numTables);
        const freeSlots = Math.floor(totalFreeMinutes / slotDuration);
        
        const bookedSlots = Math.max(0, totalStoreSlots - freeSlots);
        const percentage = totalStoreSlots === 0 ? 0 : Math.round((bookedSlots / totalStoreSlots) * 100);

        setMetric2Data({ bookedSlots, totalStoreSlots, percentage });

      } catch (error) {
        console.error("Error fetching Table Utilization data:", error);
        setMetric2Data({ bookedSlots: 0, totalStoreSlots: 0, percentage: 0 });
      }
    };

    fetchUtilization();
  // Add refreshTrigger to dependencies
  }, [currentDate, refreshTrigger]);

  const handleCardClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
    setActionMenuId(null); 
  };

  const handleUpdateStatus = async (e: React.MouseEvent, bookingRef: string, newStatus: string) => {
    e.stopPropagation(); 
    
    try {
      const response = await fetch(`${baseUrl}/booking/${bookingRef}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setBookings((prevBookings) => 
        prevBookings.map((b) => 
          b.bookingRef === bookingRef ? { ...b, status: newStatus } : b
        )
      );
      
      setActionMenuId(null);
      
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const toggleActionMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActionMenuId(actionMenuId === id ? null : id);
  };

  const upcomingBookings = bookings
    .filter(b => b.status === "created")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pastBookings = bookings
    .filter(b => ["noshow", "canceled", "success"].includes(b.status))
    .sort((a, b) => b.startTime.localeCompare(a.startTime)); 

  // --- METRIC 1 CALCULATIONS ---
  const seatedCovers = bookings.filter((b) => b.status === "success").reduce((sum, b) => sum + b.capacity, 0);
  const remainingCovers = bookings.filter((b) => b.status === "created").reduce((sum, b) => sum + b.capacity, 0);
  const activeTotalCovers = seatedCovers + remainingCovers;
  
  const coverPercentage = activeTotalCovers === 0 ? 0 : Math.round((seatedCovers / activeTotalCovers) * 100);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffsetMetric1 = circumference - (coverPercentage / 100) * circumference;

  // --- METRIC 2 CALCULATIONS (Waffle Grid) ---
  const activeSquares = metric2Data.percentage > 0 
    ? Math.max(1, Math.round((metric2Data.percentage / 100) * 25)) 
    : 0;

  // --- METRIC 3 CALCULATIONS (Attrition & Pipeline) ---
  const totalBookingsCount = bookings.length;
  const canceledCount = bookings.filter(b => b.status === "canceled").length;
  const noShowCount = bookings.filter(b => b.status === "noshow").length;
  const successCount = bookings.filter(b => b.status === "success").length;
  const createdCount = bookings.filter(b => b.status === "created").length;

  const lostBookingsCount = canceledCount + noShowCount;
  const attritionRate = totalBookingsCount === 0 ? 0 : Math.round((lostBookingsCount / totalBookingsCount) * 100);

  // Percentages for the stacked horizontal bar
  const successPct = totalBookingsCount === 0 ? 0 : (successCount / totalBookingsCount) * 100;
  const createdPct = totalBookingsCount === 0 ? 0 : (createdCount / totalBookingsCount) * 100;
  const noShowPct = totalBookingsCount === 0 ? 0 : (noShowCount / totalBookingsCount) * 100;
  const canceledPct = totalBookingsCount === 0 ? 0 : (canceledCount / totalBookingsCount) * 100;

  const renderBookingCard = (booking: Booking, isUpcoming: boolean) => (
    <div
      key={booking.id}
      onClick={() => handleCardClick(booking)}
      className={`group flex items-center gap-4 rounded-lg p-3 cursor-pointer border border-border transition-colors relative ${
        isUpcoming 
          ? "hover:bg-blue-light hover:border-blue-stroke" 
          : "hover:bg-gray-100 hover:border-gray-300"
      }`}
    >
      <div className={`flex flex-col items-center justify-center rounded-md bg-gray-100 p-3 transition-colors ${
        isUpcoming ? "group-hover:bg-blue-light" : "group-hover:bg-gray-100"
      }`}>
        <span className={`text-lg font-bold text-grey-heading ${
          isUpcoming ? "group-hover:text-blue-dark" : "group-hover:text-gray-900"
        }`}>
          {booking.startTime}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Ref: {booking.bookingRef}
        </span>
        
        {/* Updated Customer Name row to include the Special Request Badge */}
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-grey-heading leading-none ${
            isUpcoming ? "group-hover:text-blue-dark" : "group-hover:text-gray-900"
          }`}>
            {booking.customerName}
          </p>
          {booking.specialRequest && booking.specialRequest.trim() !== "" && (
            <span 
              className="flex items-center gap-1 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold  tracking-wider"
              title={`Special Request: ${booking.specialRequest}`}
            >
              <Star sx={{ fontSize: 12 }} />
              Special Request
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-grey-text mt-1">
          <div className="flex items-center gap-1.5">
            <PeopleAlt sx={{ fontSize: 18, color: 'var(--color-grey-text)' }} />
            <span>{booking.capacity} people</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TableRestaurantOutlined sx={{ fontSize: 18, color: 'var(--color-grey-text)' }} />
            <span>Table {booking.tableName}</span>
          </div>
        </div>
      </div>

      <div className="ml-auto mr-4 flex items-center gap-4">
        {isUpcoming ? (
          <>
            <button 
              onClick={(e) => handleUpdateStatus(e, booking.bookingRef, 'success')}
              className="flex items-center p-2 justify-center rounded-full text-green-600 hover:bg-green-100 transition-colors cursor-pointer"
            >
              <Check sx={{ fontSize: 22 }} />
            </button>
            
            <div className="relative">
              <button 
                onClick={(e) => toggleActionMenu(e, booking.id)}
                className={`flex items-center p-2 justify-center rounded-full transition-colors cursor-pointer ${
                  actionMenuId === booking.id ? "bg-red-100 text-red-700" : "text-red-600 hover:bg-red-100"
                }`}
              >
                <Close sx={{ fontSize: 22 }} />
              </button>

              {actionMenuId === booking.id && (
                <div className="absolute right-12 top-0 w-40 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 py-1.5 z-50">
                  <button 
                    onClick={(e) => handleUpdateStatus(e, booking.bookingRef, 'noshow')}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Mark No Show
                  </button>
                  <button 
                    onClick={(e) => handleUpdateStatus(e, booking.bookingRef, 'canceled')}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <span className={`text-[12px] leading-none font-bold px-3 py-1.5 rounded-full capitalize ${
              booking.status === 'success' ? 'bg-green-100 text-green-800' : 
              booking.status === 'noshow' ? 'bg-orange-100 text-orange-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {booking.status}
            </span>
            
            <button 
              onClick={(e) => handleUpdateStatus(e, booking.bookingRef, 'created')}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Revert to upcoming"
            >
              <Undo sx={{ fontSize: 14 }} />
              Revert
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col p-8 gap-6 relative h-[calc(100vh-70px)]">

      <div className="flex gap-5 justify-between items-stretch shrink-0">
        
        {/* METRIC 1: Total Covers */}
        <div className="flex bg-white border border-border rounded-lg p-6 w-full items-center justify-between shadow-sm">
          <div className="flex flex-col gap-3">
            <h2 className="text-md font-semibold text-gray-500  tracking-wider">
              Total Covers
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 leading-none">
                {seatedCovers}
              </span>
              <span className="text-md font-semibold text-gray-400">
                / {activeTotalCovers} Seated
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {remainingCovers} guests remaining
            </p>
          </div>

          <div className="relative flex items-center justify-center h-20 w-20">
            <svg className="transform -rotate-90 w-20 h-20">
              <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
              <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffsetMetric1} strokeLinecap="round" className={`transition-all duration-1000 ease-out ${coverPercentage === 100 ? "text-green-500" : "text-blue-500"}`} />
            </svg>
            <span className="absolute text-md font-bold text-gray-700">
              {coverPercentage}%
            </span>
          </div>
        </div>

        {/* METRIC 2: Table Utilization (Waffle Grid Layout) */}
        <div className="flex bg-white border border-border rounded-lg p-6 w-full items-center justify-between shadow-sm">
          <div className="flex flex-col gap-3">
            <h2 className="text-md font-semibold text-gray-500 tracking-wider">
              Table Utilization
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 leading-none">
                {metric2Data.percentage}%
              </span>
              <span className="text-md font-semibold text-gray-400">
                Booked
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {metric2Data.bookedSlots} / {metric2Data.totalStoreSlots} slots reserved
            </p>
          </div>

          {/* New 5x5 Waffle Grid Visual */}
          <div className="flex items-center justify-center h-20 w-20">
            <div className="grid grid-cols-5 gap-1 w-full h-full p-1">
              {Array.from({ length: 25 }).map((_, i) => {
                const row = Math.floor(i / 5);
                const col = i % 5;
                const fillIndex = (4 - row) * 5 + col; 
                const isFilled = fillIndex < activeSquares;
                
                return (
                  <div 
                    key={i} 
                    className={`rounded-[2px] transition-colors duration-500 ${
                      isFilled 
                        ? metric2Data.percentage >= 90 ? "bg-red-500" : "bg-orange-500" 
                        : "bg-gray-100"
                    }`} 
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* METRIC 3: Attrition Rate (Pipeline Bar) */}
        <div className="flex flex-col bg-white border border-border rounded-lg p-6 w-full justify-between shadow-sm gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <h2 className="text-md font-semibold text-gray-500 tracking-wider">
                Attrition Rate
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 leading-none">
                  {attritionRate}%
                </span>
                <span className="text-sm font-semibold text-gray-400">
                  Lost
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 mt-0.5">
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded leading-none border border-red-100">
                {canceledCount} Canceled
              </span>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded leading-none border border-orange-100">
                {noShowCount} No-Shows
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-auto">
            <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-gray-100">
              {successPct > 0 && <div className="bg-green-500 transition-all duration-1000" style={{ width: `${successPct}%` }} title={`Seated: ${successCount}`} />}
              {createdPct > 0 && <div className="bg-blue-400 transition-all duration-1000" style={{ width: `${createdPct}%` }} title={`Upcoming: ${createdCount}`} />}
              {noShowPct > 0 && <div className="bg-orange-400 transition-all duration-1000" style={{ width: `${noShowPct}%` }} title={`No-Show: ${noShowCount}`} />}
              {canceledPct > 0 && <div className="bg-red-500 transition-all duration-1000" style={{ width: `${canceledPct}%` }} title={`Canceled: ${canceledCount}`} />}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
              <span>Retained</span>
              <span>Lost</span>
            </div>
          </div>
        </div>

      </div>

      {/* Stacked Layout for Upcoming & Past Bookings */}
      <div className="flex flex-col gap-6 flex-1 overflow-y-auto pb-4 pr-2">
        
        {/* UPCOMING BOOKINGS */}
        <div className="flex flex-col bg-white border border-border rounded-lg p-4 gap-4 shrink-0">
          <h1 className="text-lg text-grey-heading font-bold">
            Upcoming Bookings ({upcomingBookings.length})
          </h1>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <p className="text-gray-500 text-sm mt-2">Loading bookings...</p>
            ) : upcomingBookings.length === 0 ? (
              <p className="text-gray-500 text-sm mt-2">No upcoming bookings.</p>
            ) : (
              upcomingBookings.map((booking) => renderBookingCard(booking, true))
            )}
          </div>
        </div>

        {/* PAST BOOKINGS */}
        <div className="flex flex-col bg-white border border-border rounded-lg p-4 gap-4 shrink-0">
          <h1 className="text-lg text-grey-heading font-bold">
            Past & Completed ({pastBookings.length})
          </h1>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <p className="text-gray-500 text-sm mt-2">Loading bookings...</p>
            ) : pastBookings.length === 0 ? (
              <p className="text-gray-500 text-sm mt-2">No past bookings.</p>
            ) : (
              pastBookings.map((booking) => renderBookingCard(booking, false))
            )}
          </div>
        </div>

      </div>

      {/* Detail Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        booking={selectedBooking} 
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      <AddBookingModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => {
          // Triggers both fetchBookings and fetchUtilization to re-run!
          setRefreshTrigger(prev => prev + 1); 
        }} 
      />
    </div>
  );
}