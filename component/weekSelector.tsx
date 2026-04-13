"use client";

import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface WeekSelectorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function WeekSelector({
  selectedDate,
  onChange,
}: WeekSelectorProps) {
  const weekStart = selectedDate;
  const weekEnd = addDays(selectedDate, 6);

  return (
    <div className="relative flex items-center justify-between w-[280px]">
      
      {/* Left Arrow */}
      <button
        onClick={() => onChange(addDays(selectedDate, -7))}
        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 cursor-pointer"
      >
        <ChevronLeft />
      </button>

      {/* Date Text (Center) - Added cursor-pointer here */}
      <div className="px-2 py-1.5 text-base font-bold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-1 mx-1 text-center truncate select-none cursor-pointer">
        {formatShortDate(weekStart)} - {formatShortDate(weekEnd)}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => onChange(addDays(selectedDate, 7))}
        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 cursor-pointer"
      >
        <ChevronRight />
      </button>
      
    </div>
  );
}