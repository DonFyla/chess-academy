"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-base font-semibold text-[#5E5044]",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 flex items-center justify-center rounded-full border border-[#5E5044]/20 bg-white hover:bg-[#F5EFE7] hover:text-[#5E5044] transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-[#5E5044] w-10 font-medium text-sm text-center flex-1",
        row: "flex w-full mt-2",
        cell: "h-10 w-10 text-center text-sm p-0 relative flex-1 flex justify-center items-center",
        day: cn(
          "h-10 w-10 p-0 font-normal rounded-full transition-colors hover:bg-[#F5EFE7]"
        ),
        day_selected: 
          "bg-[#5E5044] text-white hover:bg-[#4a3f35] hover:text-white",
        day_today: 
          "bg-[#F5EFE7] text-[#5E5044] font-semibold border border-[#5E5044]",
        day_outside:
          "text-gray-400 opacity-50",
        day_disabled: 
          "!text-gray-300 !opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-300"
        day_range_middle:
          "bg-[#F5EFE7] text-[#5E5044]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 text-[#5E5044]" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 text-[#5E5044]" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
