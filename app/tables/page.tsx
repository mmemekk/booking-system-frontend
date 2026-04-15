"use client";

import { useEffect, useState } from "react";
import { useTopBar } from "../../component/topbarContext";
import { config } from "../../config";
import {
  TableRestaurantOutlined,
  PeopleAltOutlined,
  Close,
  Add,
  DeleteOutline,
  EditOutlined,
  EventBusyOutlined,
} from "@mui/icons-material";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;
const BASE = `${baseUrl}/restaurant/${restaurantId}`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiTable {
  id: number;
  restaurantId: number;
  name: string;
  capacity: number;
  description: string | null;
  createdAt: string;
}

interface TableException {
  id: number;
  tableId: number;
  date: string;
  exceptTimeFrom: string;
  exceptTimeTo: string;
  isClosed: boolean;
  description: string;
}

export default function TablePage() {
  const { setTopBar } = useTopBar();

  const [tables, setTables] = useState<ApiTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<ApiTable | null>(null);

  // Modals
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<ApiTable | null>(null);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);

  // Exceptions for the currently selected table
  const [tableExceptions, setTableExceptions] = useState<TableException[]>([]);
  const [isLoadingExceptions, setIsLoadingExceptions] = useState(false);

  // ─── Top Bar Configuration ──────────────────────────────────────────────────
  useEffect(() => {
    setTopBar(
      "Tables",
      <button
        onClick={() => {
          setEditingTable(null);
          setIsTableModalOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer shadow-sm"
      >
        <Add fontSize="small" />
        Add Table
      </button>
    );
  }, [setTopBar]);

  // ─── Fetch Tables ───────────────────────────────────────────────────────────
  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE}/table`);
      if (res.ok) {
        const data = await res.json();
        setTables(data?.getTable || []);
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // ─── Fetch Exceptions when a table is selected ──────────────────────────────
  useEffect(() => {
    if (!selectedTable) return;

    const fetchExceptions = async () => {
      setIsLoadingExceptions(true);
      try {
        const res = await fetch(`${BASE}/table/${selectedTable.id}/exception?upcoming=true`);
        if (res.ok) {
          const data = await res.json();
          setTableExceptions(data?.formattedTableException || []);
        } else {
          setTableExceptions([]);
        }
      } catch (err) {
        console.error("Failed to fetch exceptions:", err);
        setTableExceptions([]);
      } finally {
        setIsLoadingExceptions(false);
      }
    };

    fetchExceptions();
  }, [selectedTable]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleDeleteTable = async (id: number) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      const res = await fetch(`${BASE}/table/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        if (selectedTable?.id === id) setSelectedTable(null);
      }
    } catch (err) {
      console.error("Failed to delete table:", err);
    }
  };

  const handleDeleteException = async (exceptionId: number) => {
    if (!selectedTable) return;
    try {
      const res = await fetch(`${BASE}/table/${selectedTable.id}/exception/${exceptionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTableExceptions((prev) => prev.filter((e) => e.id !== exceptionId));
      }
    } catch (err) {
      console.error("Failed to delete exception:", err);
    }
  };

  return (
    <div className="flex flex-row h-[calc(100vh-70px)] overflow-hidden bg-gray-50 relative p-8 items-stretch">
      
      {/* ─── Main Grid Area ─── */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 min-w-0 ${
          selectedTable ? "mr-6" : ""
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading tables...
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
            <TableRestaurantOutlined sx={{ fontSize: 64, color: "#e5e7eb" }} className="mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No Tables Found</h3>
            <p className="text-sm mt-1">Click "Add Table" in the top right to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
            {tables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(isSelected ? null : table)}
                  className={`flex flex-col bg-white rounded-xl p-5 cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? "border-blue-500 shadow-md ring-1 ring-blue-500 scale-[0.98]"
                      : "border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md hover:scale-[0.99]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                        } transition-colors`}
                      >
                        <TableRestaurantOutlined fontSize="small" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-none">{table.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 text-sm font-semibold">
                      <PeopleAltOutlined fontSize="small" />
                      {table.capacity}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 line-clamp-1">
                    {table.description || "No description"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Side Panel (Exceptions) ─── */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 flex flex-col ${
          selectedTable ? "w-96 opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div className="w-96 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* Panel Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TableRestaurantOutlined className="text-blue-600" fontSize="small" />
                <h3 className="font-bold text-gray-900 text-xl leading-tight">
                  {selectedTable?.name}
                </h3>
              </div>
              <p className="text-sm font-medium text-gray-500">
                Capacity: {selectedTable?.capacity} Seats
              </p>
              <p className="text-sm font-medium text-gray-500">
                {selectedTable?.description ? ` Description:  ${selectedTable.description}` : ""}
              </p>

            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingTable(selectedTable);
                  setIsTableModalOpen(true);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                title="Edit Table"
              >
                <EditOutlined fontSize="small" />
              </button>
              <button
                onClick={() => selectedTable && handleDeleteTable(selectedTable.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Delete Table"
              >
                <DeleteOutline fontSize="small" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button
                onClick={() => setSelectedTable(null)}
                className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <Close fontSize="small" />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
            
            {/* Exceptions Section */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Upcoming Exceptions
                </h4>
                <button
                  onClick={() => setIsExceptionModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Add fontSize="small" sx={{ fontSize: 16 }} />
                  Add
                </button>
              </div>

              {isLoadingExceptions ? (
                <div className="text-sm text-gray-500 text-center py-8">Loading exceptions...</div>
              ) : tableExceptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-8 opacity-60">
                  <EventBusyOutlined sx={{ fontSize: 40 }} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No upcoming exceptions.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tableExceptions.map((exc) => (
                    <div key={exc.id} className="relative group p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-sm">
                          {new Date(exc.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${exc.isClosed ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                          {exc.isClosed ? "Closed All Day" : "Blocked Slot"}
                        </span>
                      </div>
                      
                      {!exc.isClosed && (
                        <div className="text-xs text-gray-500 font-medium mb-1.5">
                          {exc.exceptTimeFrom} — {exc.exceptTimeTo}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        {exc.description || "No reason provided."}
                      </p>

                      {/* Delete Exception Button (appears on hover) */}
                      <button
                        onClick={() => handleDeleteException(exc.id)}
                        className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                        title="Remove Exception"
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}
      {isTableModalOpen && (
        <TableModal
          table={editingTable}
          onClose={() => setIsTableModalOpen(false)}
          onSuccess={() => {
            fetchTables();
            setIsTableModalOpen(false);
          }}
        />
      )}

      {isExceptionModalOpen && selectedTable && (
        <ExceptionModal
          tableId={selectedTable.id}
          onClose={() => setIsExceptionModalOpen(false)}
          onSuccess={(newExc) => {
            // Optimistically add the new exception to the list so we don't have to refetch immediately
            setTableExceptions((prev) => [...prev, newExc].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setIsExceptionModalOpen(false);
          }}
        />
      )}

    </div>
  );
}

// ─── Sub-Component: Table Modal ───────────────────────────────────────────────

function TableModal({ table, onClose, onSuccess }: { table: ApiTable | null; onClose: () => void; onSuccess: () => void }) {
  const isEditing = !!table;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: table?.name || "",
    capacity: table?.capacity ? String(table.capacity) : "2",
    description: table?.description || "",
  });

  const parsedCapacity = Number(formData.capacity);
  const isCapacityInvalid = formData.capacity !== "" && parsedCapacity < 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCapacity < 1) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        capacity: parsedCapacity,
        description: formData.description,
      };

      if (isEditing) {
        // Edit Table
        await fetch(`${BASE}/table/${table.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create Table
        const res = await fetch(`${BASE}/table`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        // If creation was successful, automatically sync it to standard store hours!
        if (res.ok) {
          const createdData = await res.json();
          const newTableId = createdData?.createdTable?.id || createdData?.id;
          
          if (newTableId) {
            await fetch(`${BASE}/table/${newTableId}/availability`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isUseStoreHour: true,
              }),
            }).catch(err => console.error("Quiet availability sync failed:", err));
          }
        }
      }
      onSuccess();
    } catch (err) {
      console.error("Failed to save table:", err);
      alert("Failed to save table. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? "Edit Table" : "Add New Table"}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Close fontSize="small" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Table Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" placeholder="e.g. Table 1" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Capacity *</label>
            <input 
              type="text" 
              inputMode="numeric"
              required 
              value={formData.capacity} 
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                const cleaned = val ? String(Number(val)) : "";
                setFormData({ ...formData, capacity: cleaned });
              }}
              className={`w-full h-10 px-3 rounded-lg border shadow-sm focus:ring-1 text-sm ${
                isCapacityInvalid 
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`} 
            />
            {isCapacityInvalid && (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">Capacity must be at least 1.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5  tracking-wide">Description (Optional)</label>
            <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm resize-none" placeholder="e.g. Near the kitchen" />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting || isCapacityInvalid || formData.capacity === ""} 
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isEditing ? (isSubmitting ? "Saving..." : "Save Changes") : (isSubmitting ? "Creating..." : "Create Table")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-Component: Exception Modal ───────────────────────────────────────────

function ExceptionModal({ tableId, onClose, onSuccess }: { tableId: number; onClose: () => void; onSuccess: (exc: any) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    exceptTimeFrom: "12:00",
    exceptTimeTo: "14:00",
    isClosed: false,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE}/table/${tableId}/exception`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        // Create a mock object to instantly pass back up to the UI state
        onSuccess({ id: Date.now(), tableId, ...formData });
      } else {
        alert("Failed to add exception.");
      }
    } catch (err) {
      console.error("Failed to add exception:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Block Table</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Close fontSize="small" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input type="checkbox" checked={formData.isClosed} onChange={(e) => setFormData({ ...formData, isClosed: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
            <span className="text-sm font-bold text-gray-800">Close Table All Day</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Date *</label>
            <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white" />
          </div>

          {!formData.isClosed && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">From *</label>
                <input type="time" required value={formData.exceptTimeFrom} onChange={(e) => setFormData({ ...formData, exceptTimeFrom: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">To *</label>
                <input type="time" required value={formData.exceptTimeTo} onChange={(e) => setFormData({ ...formData, exceptTimeTo: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide">Reason (Optional)</label>
            <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" placeholder="e.g. VIP Party" />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:bg-blue-400">
              {isSubmitting ? "Saving..." : "Save Exception"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}