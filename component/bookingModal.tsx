"use client";

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
} from "@mui/icons-material";

export interface BookingDetails {
  bookingRef: string;
  tableName: number;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  capacity: number;
  specialRequest?: string;
  status: string; // <-- Added status field here
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetails | null;
}

export default function BookingModal({ isOpen, onClose, booking }: BookingModalProps) {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
          <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
          
          <div className="flex items-center gap-4">
            {/* Status Badge added here to match Dashboard style */}
            <span className={`text-[11px] leading-none font-bold px-3 py-1.5 rounded-full capitalize ${
              booking.status === 'success' ? 'bg-green-100 text-green-800' : 
              booking.status === 'noshow' ? 'bg-orange-100 text-orange-800' : 
              booking.status === 'created' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800' // fallback for canceled or other
            }`}>
              {booking.status}
            </span>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Close />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 px-8 py-6">
          
          {/* Reference Badge */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-blue-700 w-fit">
            <ReceiptOutlined sx={{ fontSize: 20 }} />
            <span className="text-sm font-bold tracking-wide">Ref: {booking.bookingRef}</span>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            
            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><PersonOutline sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Customer</span>
                <span className="text-base font-semibold text-gray-900">{booking.customerName}</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><PhoneOutlined sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Contact</span>
                <span className="text-base font-semibold text-gray-900">{booking.customerPhone}</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><CalendarTodayOutlined sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Date</span>
                <span className="text-base font-semibold text-gray-900">{booking.bookingDate}</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><AccessTimeOutlined sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Time</span>
                <span className="text-base font-semibold text-gray-900">{booking.startTime}</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><TableRestaurantOutlined sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Table</span>
                <span className="text-base font-semibold text-gray-900">Table {booking.tableName}</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-0.5 text-gray-400"><PeopleAltOutlined sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Guests</span>
                <span className="text-base font-semibold text-gray-900">{booking.capacity} People</span>
              </div>
            </div>
          </div>

          {/* Special Request Full Width */}
          {booking.specialRequest && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
              <div className="mt-0.5 text-orange-500"><StarOutline sx={{ fontSize: 24 }} /></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Special Request</span>
                <span className="text-base font-medium text-orange-900">{booking.specialRequest}</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-5 flex justify-end gap-4">
          <button className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Edit Booking
          </button>
        </div>

      </div>
    </div>
  );
}