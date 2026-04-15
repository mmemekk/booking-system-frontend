"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../component/topbarContext";
import { config } from "../../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

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
    slotDuration: 30, // Default fallback
  });

  const [isLoading, setIsLoading] = useState(true);
  
  // Loading states for individual buttons
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  
  // Status states for inline notifications
  const [detailsSaveStatus, setDetailsSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hoursSaveStatus, setHoursSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

  // Set Top Bar
  useEffect(() => {
    setTopBar("Settings", <div />);
  }, [setTopBar]);

  // -----------------------------
  // FETCH INITIAL DATA
  // -----------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch both Details and Hours concurrently
        const [resDetails, resHours] = await Promise.all([
          fetch(`${baseUrl}/restaurant/${restaurantId}`),
          fetch(`${baseUrl}/restaurant/${restaurantId}/store-hour`)
        ]);

        // 1. Process Restaurant Details
        if (resDetails.ok) {
          const data = await resDetails.json();
          if (data.restaurant) {
            setRestaurantDetails({
              name: data.restaurant.name || "",
              branch: data.restaurant.branch || "",
              phone: data.restaurant.phone || "",
              email: data.restaurant.email || "",
              slotDuration: data.restaurant.slotDuration || 30,
            });
          }
        } else {
          console.error("Failed to fetch restaurant details");
        }

        // 2. Process Operating Hours
        if (resHours.ok) {
          const hoursData = await resHours.json();
          const formattedHours = hoursData.formattedStoreHours || [];
          
          if (formattedHours.length > 0) {
            setOperatingHours((prev: any) => {
              const updatedHours = { ...prev };
              formattedHours.forEach((h: any) => {
                // Capitalize the day from the API (e.g. "monday" -> "Monday") to match our state keys
                const capitalizedDay = h.dayOfWeek.charAt(0).toUpperCase() + h.dayOfWeek.slice(1);
                
                if (updatedHours[capitalizedDay]) {
                  updatedHours[capitalizedDay] = {
                    open: h.openTime,
                    close: h.closeTime,
                    isOpen: !h.isClosed, // Inverse of isClosed
                  };
                }
              });
              return updatedHours;
            });
          }
        } else {
          console.error("Failed to fetch store hours");
        }

      } catch (error) {
        console.error("Error fetching initial settings data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // -----------------------------
  // HANDLERS
  // -----------------------------
  const handleRestaurantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Restrict phone input to numbers only
    if (name === "phone") {
      const numbersOnly = value.replace(/\D/g, "");
      setRestaurantDetails((prev) => ({
        ...prev,
        [name]: numbersOnly,
      }));
      return;
    }

    setRestaurantDetails((prev) => ({ 
      ...prev, 
      [name]: name === "slotDuration" ? Number(value) : value 
    }));
  };

  const handleHoursChange = (day: string, field: string, value: any) => {
    setOperatingHours((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // API Call to Update Restaurant Details
  const handleSaveRestaurantDetails = async () => {
    setIsSavingDetails(true);
    setDetailsSaveStatus("idle");
    try {
      const response = await fetch(`${baseUrl}/restaurant/${restaurantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: restaurantDetails.name,
          branch: restaurantDetails.branch,
          phone: restaurantDetails.phone,
          email: restaurantDetails.email,
          slotDuration: restaurantDetails.slotDuration,
        }),
      });

      if (response.ok) {
        setDetailsSaveStatus("success");
      } else {
        setDetailsSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving restaurant details:", error);
      setDetailsSaveStatus("error");
    } finally {
      setIsSavingDetails(false);
      setTimeout(() => setDetailsSaveStatus("idle"), 3000);
    }
  };

  // API Call to Update Operating Hours
  const handleSaveHours = async () => {
    setIsSavingHours(true);
    setHoursSaveStatus("idle");
    
    try {
      // Create an array of PATCH promises for all 7 days
      const updatePromises = days.map((day) => {
        const dayData = operatingHours[day];
        const lowerCaseDay = day.toLowerCase(); // Format required by the API

        return fetch(`${baseUrl}/restaurant/${restaurantId}/store-hour/${lowerCaseDay}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            openTime: dayData.open,
            closeTime: dayData.close,
            isClosed: !dayData.isOpen, // Convert UI 'isOpen' back to API 'isClosed'
          }),
        });
      });

      // Wait for all 7 requests to finish concurrently
      const results = await Promise.all(updatePromises);
      
      // Check if ALL requests were successful
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        setHoursSaveStatus("success");

        // Quietly update all tables in the restaurant to sync with the new store hours (Single API Call)
        fetch(`${baseUrl}/restaurant/${restaurantId}/table/availability/all`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            isUseStoreHour: true
          }),
        }).catch(err => console.error("Error quietly syncing tables with store hours:", err));

      } else {
        console.error("Some days failed to update properly.");
        setHoursSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving operating hours:", error);
      setHoursSaveStatus("error");
    } finally {
      setIsSavingHours(false);
      setTimeout(() => setHoursSaveStatus("idle"), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex p-8 items-center justify-center text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8 gap-6">

      {/* =========================
          RESTAURANT DETAILS
      ========================== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Restaurant Details
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your restaurant's core information and booking preferences.
          </p>
        </div>

        <div className="space-y-6 p-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Restaurant Name
              </label>
              <input
                name="name"
                value={restaurantDetails.name}
                onChange={handleRestaurantChange}
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                value={restaurantDetails.phone}
                onChange={handleRestaurantChange}
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                name="email"
                type="email"
                value={restaurantDetails.email}
                onChange={handleRestaurantChange}
                className="mt-1 block w-full h-9 rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slot Duration
            </label>
            <select
              name="slotDuration"
              value={restaurantDetails.slotDuration}
              onChange={handleRestaurantChange}
              className="mt-1 block w-48 h-9 rounded-md border-gray-300 px-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Determines how your timeline grids and availability slots are divided.
            </p>
          </div>

        </div>

        <div className="flex items-center justify-end gap-4 bg-gray-50 px-6 py-3 rounded-b-xl border-t border-gray-100">
          {detailsSaveStatus === "success" && (
            <span className="text-sm font-medium text-green-600 animate-pulse">
              Updated successfully!
            </span>
          )}
          {detailsSaveStatus === "error" && (
            <span className="text-sm font-medium text-red-600 animate-pulse">
              Failed to update.
            </span>
          )}
          <button
            onClick={handleSaveRestaurantDetails}
            disabled={isSavingDetails}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
              isSavingDetails ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSavingDetails ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* =========================
          OPERATING HOURS
      ========================== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Operating Hours
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Set the weekly opening and closing times.
          </p>
        </div>

        <div className="divide-y divide-gray-100 p-6">
          {days.map((day) => (
            <div key={day} className="grid grid-cols-4 items-center gap-4 py-4 first:pt-0 last:pb-0">

              <span className="font-medium text-gray-800">{day}</span>

              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="time"
                  value={operatingHours[day].open}
                  disabled={!operatingHours[day].isOpen}
                  onChange={(e) =>
                    handleHoursChange(day, "open", e.target.value)
                  }
                  className="w-full h-9 rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="text-gray-400 font-medium">-</span>
                <input
                  type="time"
                  value={operatingHours[day].close}
                  disabled={!operatingHours[day].isOpen}
                  onChange={(e) =>
                    handleHoursChange(day, "close", e.target.value)
                  }
                  className="w-full h-9 rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-end gap-3 text-sm text-gray-600">
                <label className="relative inline-block w-[38px] h-[22px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operatingHours[day].isOpen}
                    onChange={(e) =>
                      handleHoursChange(day, "isOpen", e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="absolute inset-0 bg-gray-300 rounded-full transition-colors peer-checked:bg-blue-600"></div>
                  <div className="absolute left-[3px] bottom-[3px] h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-[16px]"></div>
                </label>
                <span className="w-14 font-medium">{operatingHours[day].isOpen ? "Open" : "Closed"}</span>
              </div>

            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 bg-gray-50 px-6 py-3 rounded-b-xl border-t border-gray-100">
          {hoursSaveStatus === "success" && (
            <span className="text-sm font-medium text-green-600 animate-pulse">
              Hours saved successfully!
            </span>
          )}
          {hoursSaveStatus === "error" && (
            <span className="text-sm font-medium text-red-600 animate-pulse">
              Failed to save hours.
            </span>
          )}
          <button
            onClick={handleSaveHours}
            disabled={isSavingHours}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
              isSavingHours ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isSavingHours ? "Saving..." : "Save Hours"}
          </button>
        </div>
      </div>

    </div>
  );
}