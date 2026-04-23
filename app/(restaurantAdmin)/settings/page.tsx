"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../../component/topbarContext";
import { config } from "../../../config";
import {
  Close,
  Add,
  DeleteOutline,
  EditOutlined,
  EventBusyOutlined,
} from "@mui/icons-material";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreException {
  id: number;
  restaurantId: number;
  date: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  description: string;
}

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
  const [detailsSaveStatus, setDetailsSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [hoursSaveStatus, setHoursSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const [operatingHours, setOperatingHours] = useState(
    days.reduce((acc, day) => {
      acc[day] = {
        open: "11:00",
        close: "22:00",
        isOpen: day !== "Sunday",
      };
      return acc;
    }, {} as any),
  );

  // Store Exceptions State
  const [storeExceptions, setStoreExceptions] = useState<StoreException[]>([]);
  const [isLoadingExceptions, setIsLoadingExceptions] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [editingException, setEditingException] =
    useState<StoreException | null>(null);

  // Custom Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<number | null>(
    null,
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
          fetch(`${baseUrl}/restaurant/${restaurantId}/store-hour`),
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
                const capitalizedDay =
                  h.dayOfWeek.charAt(0).toUpperCase() + h.dayOfWeek.slice(1);

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

  // ─── Fetch Store Exceptions ─────────────────────────────────────────────────
  const fetchStoreExceptions = async () => {
    setIsLoadingExceptions(true);
    try {
      const res = await fetch(
        `${baseUrl}/restaurant/${restaurantId}/store-exception?upcoming=true`,
      );
      if (res.ok) {
        const data = await res.json();
        setStoreExceptions(data?.formattedStoreException || []);
      } else {
        setStoreExceptions([]);
      }
    } catch (err) {
      console.error("Failed to fetch store exceptions:", err);
      setStoreExceptions([]);
    } finally {
      setIsLoadingExceptions(false);
    }
  };

  useEffect(() => {
    fetchStoreExceptions();
  }, []);

  // -----------------------------
  // HANDLERS
  // -----------------------------
  const handleRestaurantChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
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
      [name]: name === "slotDuration" ? Number(value) : value,
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

        return fetch(
          `${baseUrl}/restaurant/${restaurantId}/store-hour/${lowerCaseDay}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              openTime: dayData.open,
              closeTime: dayData.close,
              isClosed: !dayData.isOpen, // Convert UI 'isOpen' back to API 'isClosed'
            }),
          },
        );
      });

      // Wait for all 7 requests to finish concurrently
      const results = await Promise.all(updatePromises);

      // Check if ALL requests were successful
      const allSuccessful = results.every((res) => res.ok);

      if (allSuccessful) {
        setHoursSaveStatus("success");

        // Quietly update all tables in the restaurant to sync with the new store hours (Single API Call)
        fetch(`${baseUrl}/restaurant/${restaurantId}/table/availability/all`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dayOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            isUseStoreHour: true,
          }),
        }).catch((err) =>
          console.error("Error quietly syncing tables with store hours:", err),
        );
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

  // ─── Exception Handlers ─────────────────────────────────────────────────────

  // Open the custom delete confirmation modal
  const handleDeleteClick = (exceptionId: number) => {
    setExceptionToDelete(exceptionId);
    setIsDeleteModalOpen(true);
  };

  // Process the actual deletion when confirmed
  const confirmDeleteException = async () => {
    if (exceptionToDelete === null) return;

    try {
      const res = await fetch(
        `${baseUrl}/restaurant/${restaurantId}/store-exception/${exceptionToDelete}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setStoreExceptions((prev) =>
          prev.filter((e) => e.id !== exceptionToDelete),
        );
      } else {
        alert("Failed to delete exception.");
      }
    } catch (err) {
      console.error("Failed to delete exception:", err);
      alert("Failed to delete exception. Please try again.");
    } finally {
      setIsDeleteModalOpen(false);
      setExceptionToDelete(null);
    }
  };

  const handleEditException = (exception: StoreException) => {
    setEditingException(exception);
    setIsExceptionModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex p-8 items-center justify-center text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-8 gap-6 relative">
      {/* =========================
          CUSTOM DELETE MODAL
      ========================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <DeleteOutline fontSize="large" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Exception?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete this store exception? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setExceptionToDelete(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteException}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
              Determines how your timeline grids and availability slots are
              divided.
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
              isSavingDetails
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
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
            <div
              key={day}
              className="grid grid-cols-4 items-center gap-4 py-4 first:pt-0 last:pb-0"
            >
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
                <span className="w-14 font-medium">
                  {operatingHours[day].isOpen ? "Open" : "Closed"}
                </span>
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
              isSavingHours
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isSavingHours ? "Saving..." : "Save Hours"}
          </button>
        </div>
      </div>

      {/* =========================
          STORE EXCEPTIONS
      ========================== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Store Exceptions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage special dates when your restaurant has different hours or
              is closed.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingException(null);
              setIsExceptionModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer shadow-sm"
          >
            <Add fontSize="small" />
            Add Exception
          </button>
        </div>

        <div className="p-6">
          {isLoadingExceptions ? (
            <div className="text-sm text-gray-500 text-center py-8">
              Loading exceptions...
            </div>
          ) : storeExceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 opacity-60">
              <EventBusyOutlined
                sx={{ fontSize: 48 }}
                className="text-gray-300 mb-3"
              />
              <p className="text-sm text-gray-500 font-medium">
                No store exceptions set up yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add your first exception to handle holidays, events, or special
                hours.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeExceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="relative group p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:border-blue-200 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {new Date(exception.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${exception.isClosed ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}
                    >
                      {exception.isClosed ? "Closed All Day" : "Modified Hours"}
                    </span>
                  </div>

                  {!exception.isClosed && (
                    <div className="text-xs text-gray-500 font-medium mb-2">
                      {exception.openTime} — {exception.closeTime}
                    </div>
                  )}

                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    {exception.description || "No description provided."}
                  </p>

                  {/* Action buttons */}
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditException(exception)}
                      className="bg-white border border-gray-200 text-blue-500 p-1.5 rounded-full shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Edit Exception"
                    >
                      <EditOutlined fontSize="small" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(exception.id)}
                      className="bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete Exception"
                    >
                      <DeleteOutline fontSize="small" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exception Modal Rendered Inside Main Flex Container or Body */}
      {isExceptionModalOpen && (
        <ExceptionModal
          exception={editingException}
          onClose={() => setIsExceptionModalOpen(false)}
          onSuccess={() => {
            fetchStoreExceptions();
            setIsExceptionModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-Component: Exception Modal ───────────────────────────────────────────

function ExceptionModal({
  exception,
  onClose,
  onSuccess,
}: {
  exception: StoreException | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!exception;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: exception?.date || new Date().toISOString().split("T")[0],
    openTime: exception?.openTime || "11:00",
    closeTime: exception?.closeTime || "22:00",
    isClosed: exception?.isClosed || false,
    description: exception?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        isClosed: formData.isClosed,
        description: formData.description,
      };

      let res;
      if (isEditing) {
        // Edit Exception
        res = await fetch(
          `${baseUrl}/restaurant/${restaurantId}/store-exception/${exception.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
      } else {
        // Create Exception
        res = await fetch(
          `${baseUrl}/restaurant/${restaurantId}/store-exception`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
      }

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        alert(
          `Failed to ${isEditing ? "update" : "create"} exception: ${errorData.message || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error(
        `Failed to ${isEditing ? "update" : "create"} exception:`,
        err,
      );
      alert(
        `Failed to ${isEditing ? "update" : "create"} exception. Please try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? "Edit Store Exception" : "Add Store Exception"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <Close fontSize="small" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.isClosed}
              onChange={(e) =>
                setFormData({ ...formData, isClosed: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-gray-800">
              Close Store All Day
            </span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
            />
          </div>

          {!formData.isClosed && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                  Open Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.openTime}
                  onChange={(e) =>
                    setFormData({ ...formData, openTime: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
                  Close Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.closeTime}
                  onChange={(e) =>
                    setFormData({ ...formData, closeTime: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">
              Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="e.g. Holiday, Maintenance, Private Event"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:bg-blue-400"
            >
              {isEditing
                ? isSubmitting
                  ? "Saving..."
                  : "Save Changes"
                : isSubmitting
                  ? "Creating..."
                  : "Create Exception"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
