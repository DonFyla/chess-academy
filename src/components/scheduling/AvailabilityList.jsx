'use client'

import { DAYS_OF_WEEK } from '@/lib/scheduling-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

function formatTime(time) {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function AvailabilityList({ slots, onDelete, isDeleting }) {
  const groupedByDay = slots.reduce((acc, slot) => {
    const day = slot.day_of_week
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {})

  if (slots.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No availability set yet. Add your first slot above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDay).map(([day, daySlots]) => (
        <div key={day} className="border rounded-lg p-4 bg-white">
          <h4 className="font-medium mb-3 text-black">{DAYS_OF_WEEK[parseInt(day)]}</h4>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => (
              <Badge
                key={slot.id}
                variant="outline"
                className="text-sm py-1.5 px-3 flex items-center gap-2 border-[#5E5044] text-[#5E5044]"
              >
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-red-100"
                    onClick={() => onDelete(slot.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
