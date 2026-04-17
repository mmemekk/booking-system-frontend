"use client";

import { useEffect } from "react";
import { useTopBar } from "../../../component/topbarContext";
import {
  HelpOutline,
  MenuBookOutlined,
  LiveHelpOutlined,
  OpenInNewOutlined,
  DashboardOutlined,
  CalendarMonthOutlined,
  EventAvailableOutlined,
  SettingsOutlined,
  EmailOutlined,
} from "@mui/icons-material";

export default function Help() {
  const { setTopBar } = useTopBar();

  useEffect(() => {
    setTopBar("Help & Support", <div />);
  }, [setTopBar]);

  return (
    <div className="flex flex-col p-8 gap-6 ">
      {/* Header Info */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpOutline fontSize="large" className="text-blue-600" />
          Help & Support Center
        </h1>
        <p className="mt-2 text-base text-gray-500">
          Learn how to navigate your restaurant dashboard, manage live
          operations, and configure your system.
        </p>
      </div>

      {/* =========================
          MODULE OVERVIEW
      ========================== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MenuBookOutlined fontSize="small" className="text-gray-500" />
            System Overview
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            A quick guide to your main navigation tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6 flex items-start gap-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DashboardOutlined />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Dashboard</h4>
              <p className="text-sm text-gray-500 mt-1">
                Your live operational hub. View real-time covers, table
                utilization grids, and pipeline attrition. Process incoming
                guests by marking them as seated, canceled, or no-shows.
              </p>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarMonthOutlined />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Bookings Timeline</h4>
              <p className="text-sm text-gray-500 mt-1">
                A visual timeline of your restaurant floor. See exactly which
                tables are occupied, spot gaps in service, and view blocked-off
                "Exception" periods per table.
              </p>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4 border-t border-gray-100">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <EventAvailableOutlined />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Availabilities</h4>
              <p className="text-sm text-gray-500 mt-1">
                A 7-day rolling window of your entire capacity. Quickly spot
                bottlenecks with color-coded slots showing exactly how many
                tables are left at any given minute.
              </p>
            </div>
          </div>

          <div className="p-6 flex items-start gap-4 border-t border-gray-100">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <SettingsOutlined />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Settings</h4>
              <p className="text-sm text-gray-500 mt-1">
                Configure your core mechanics. Update contact details, set your
                weekly operating hours, and define your standard time slot
                duration (e.g., 15 or 30 mins).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          FAQ SECTION
      ========================== */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LiveHelpOutlined fontSize="small" className="text-gray-500" />
            Frequently Asked Questions
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Answers to common operational questions.
          </p>
        </div>

        <div className="divide-y divide-gray-100 p-6 flex flex-col gap-5">
          <div className="pb-5">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              How do I create a walk-in or manual phone booking?
            </h4>
            <p className="text-sm text-gray-600">
              Click the blue <strong>"Add Booking"</strong> button found in the
              top bar of your Dashboard or Bookings timeline. The system will
              automatically suggest tables that meet both the capacity
              requirement and the specific time availability.
            </p>
          </div>

          <div className="pt-5 pb-5">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              How do I mark a guest as arrived, canceled, or a no-show?
            </h4>
            <p className="text-sm text-gray-600">
              On the Dashboard, locate the guest's card under "Upcoming
              Bookings." Click the green checkmark to seat them. To cancel or
              mark as a no-show, click the red 'X' to reveal the secondary
              action menu. If you make a mistake, you can use the "Revert"
              button in the Past Bookings list.
            </p>
          </div>

          <div className="pt-5 pb-5">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              What do the fractions (e.g., "3/4") mean on the Availabilities
              grid?
            </h4>
            <p className="text-sm text-gray-600">
              This represents your remaining capacity. The first number is how
              many tables are completely free to be booked for that specific
              30-minute block. The second number is your absolute total table
              count. If it turns orange, you are nearing maximum capacity!
            </p>
          </div>

          <div className="pt-5">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              Why can't I see certain times on the timeline grid?
            </h4>
            <p className="text-sm text-gray-600">
              The grid scales dynamically based on the Operating Hours you set
              in the <strong>Settings</strong> tab. If a time is missing, ensure
              your Open and Close times are configured correctly for that
              specific day of the week.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
