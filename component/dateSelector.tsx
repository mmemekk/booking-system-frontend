"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface DateSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onChange }: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Track the month currently being viewed inside the dropdown calendar
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync the calendar view back to the selected date whenever the dropdown is opened
  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Main Top Bar Arrow Handlers ---
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    onChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    onChange(newDate);
  };

  const formattedDate = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // --- Calendar Dropdown Logic ---
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  // --- Dropdown Arrow Handlers ---
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the dropdown from closing
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDaySelect = (day: number) => {
    onChange(new Date(currentYear, currentMonth, day));
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center justify-between w-[280px]" ref={dropdownRef}>
      
      {/* Left Arrow */}
      <button
        onClick={handlePrevDay}
        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 cursor-pointer"
      >
        <ChevronLeft />
      </button>

      {/* Date Text (Trigger) - Added cursor-pointer here */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1.5 text-base font-bold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-1 mx-1 text-center truncate cursor-pointer"
      >
        {formattedDate}
      </button>

      {/* Right Arrow */}
      <button
        onClick={handleNextDay}
        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 cursor-pointer"
      >
        <ChevronRight />
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button 
              onClick={handlePrevMonth} 
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft fontSize="small" />
            </button>
            <div className="font-bold text-gray-800">
              {viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
            <button 
              onClick={handleNextMonth} 
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <ChevronRight fontSize="small" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
            <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-sm">
            {/* Empty slots for start of month */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              
              const isSelected = 
                dayNum === selectedDate.getDate() &&
                currentMonth === selectedDate.getMonth() &&
                currentYear === selectedDate.getFullYear();

              return (
                <button
                  key={dayNum}
                  onClick={() => handleDaySelect(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-blue-600 text-white font-bold shadow-md" 
                      : "text-gray-700 hover:bg-gray-100 hover:font-semibold"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}