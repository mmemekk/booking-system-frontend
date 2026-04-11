"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../component/topbarContext";

export default function Settings() {
  const { setTopBar } = useTopBar();

  // -----------------------------
  // STATE
  // -----------------------------
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: "",
    branch: "",
    phone: "",
    email: "",
  });

  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const [operatingHours, setOperatingHours] = useState(
    days.reduce((acc, day) => {
      acc[day] = {
        open: "11:00",
        close: "22:00",
        isOpen: day !== "Sunday",
      };
      return acc;
    }, {} as any)
  );

  const [bookingSettings, setBookingSettings] = useState({
    slotDuration: "90",
    interval: "15",
    onlineBooking: true,
  });

  useEffect(() => {
    setTopBar("Settings", <div />);
  }, []);

  // -----------------------------
  // HANDLERS
  // -----------------------------
  const handleRestaurantChange = (e: any) => {
    const { name, value } = e.target;
    setRestaurantDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleHoursChange = (day: string, field: string, value: any) => {
    setOperatingHours((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleBookingChange = (field: string, value: any) => {
    setBookingSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col p-8 gap-6">

        {/* =========================
            RESTAURANT DETAILS
        ========================== */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Restaurant Details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your restaurant's information.
            </p>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Restaurant Name
              </label>
              <input
                name="name"
                value={restaurantDetails.name}
                onChange={handleRestaurantChange}
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Branch
              </label>
              <input
                name="branch"
                value={restaurantDetails.branch}
                onChange={handleRestaurantChange}
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={restaurantDetails.phone}
                  onChange={handleRestaurantChange}
                  className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <input
                  name="email"
                  value={restaurantDetails.email}
                  onChange={handleRestaurantChange}
                  className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end bg-gray-50 px-6 py-3">
            <button
              onClick={() => console.log(restaurantDetails)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* =========================
            OPERATING HOURS
        ========================== */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Operating Hours
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Set the weekly opening and closing times.
            </p>
          </div>

          <div className="divide-y divide-gray-200 p-6">
            {days.map((day) => (
              <div key={day} className="grid grid-cols-4 items-center gap-4 py-4">

                <span className="font-medium text-gray-800">{day}</span>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={operatingHours[day].open}
                    disabled={!operatingHours[day].isOpen}
                    onChange={(e) =>
                      handleHoursChange(day, "open", e.target.value)
                    }
                    className="w-full h-9 rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={operatingHours[day].close}
                    disabled={!operatingHours[day].isOpen}
                    onChange={(e) =>
                      handleHoursChange(day, "close", e.target.value)
                    }
                    className="w-full h-9 rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary disabled:bg-gray-100"
                  />
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                  <label className="relative inline-block w-[38px] h-[22px]">
                    <input
                      type="checkbox"
                      checked={operatingHours[day].isOpen}
                      onChange={(e) =>
                        handleHoursChange(day, "isOpen", e.target.checked)
                      }
                      className="peer sr-only"
                    />
                    <div className="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-blue-600"></div>
                    <div className="absolute left-[3px] bottom-[3px] h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-[16px]"></div>
                  </label>
                  <span className="w-14">{operatingHours[day].isOpen ? "Open" : "Closed"}</span>
                </div>

              </div>
            ))}
          </div>

          <div className="flex justify-end bg-gray-50 px-6 py-3">
            <button
              onClick={() => console.log(operatingHours)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Save Hours
            </button>
          </div>
        </div>

        {/* =========================
            BOOKING SETTINGS
        ========================== */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Booking Settings
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure your reservation preferences.
            </p>
          </div>

          <div className="space-y-6 p-6">

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Default Slot Duration
              </span>
              <select
                value={bookingSettings.slotDuration}
                onChange={(e) =>
                  handleBookingChange("slotDuration", e.target.value)
                }
                className="w-48 h-9 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Booking Interval
              </span>
              <select
                value={bookingSettings.interval}
                onChange={(e) =>
                  handleBookingChange("interval", e.target.value)
                }
                className="w-48 h-9 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <span className="text-sm font-medium text-gray-700">
                Accept Online Bookings
              </span>

              <label className="relative inline-block w-[38px] h-[22px]">
                <input
                  type="checkbox"
                  checked={bookingSettings.onlineBooking}
                  onChange={(e) =>
                    handleBookingChange("onlineBooking", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-blue-600"></div>
                <div className="absolute left-[3px] bottom-[3px] h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-[16px]"></div>
              </label>
            </div>

          </div>

          <div className="flex justify-end bg-gray-50 px-6 py-3">
            <button
              onClick={() => console.log(bookingSettings)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>

    </div>
  );
}