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
        table: "w-full",
        head_row: "grid grid-cols-7 w-full",
        head_cell: "text-[#5E5044] font-medium text-sm text-center py-1",
        row: "grid grid-cols-7 w-full mt-1",
        cell: "h-10 flex items-center justify-center text-sm p-0 relative",
        day: cn(
          "h-9 w-9 p-0 font-normal rounded-full transition-colors hover:bg-[#F5EFE7] flex items-center justify-center"
        ),
        day_selected: 
          "bg-[#5E5044] text-white hover:bg-[#4a3f35] hover:text-white",
        day_today: 
          "bg-[#F5EFE7] text-[#5E5044] font-semibold border border-[#5E5044]",
        day_outside:
          "text-gray-300 opacity-40",
        day_disabled: 
          "text-gray-200 opacity-20 hover:bg-transparent hover:text-gray-200 cursor-default",
        day_range_middle:
          "bg-[#F5EFE7] text-[#5E5044]",
        day_hidden: "invisible",
        ...classNames,
      }}
      modifiersStyles={{
        disabled: {
          color: '#e5e5e5',
          opacity: 0.2,
        }
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
