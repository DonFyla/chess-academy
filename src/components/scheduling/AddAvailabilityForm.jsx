'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DAYS_OF_WEEK } from '@/lib/scheduling-types'
import { Plus } from 'lucide-react'

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return [`${hour}:00`, `${hour}:30`]
}).flat()

export default function AddAvailabilityForm({ onAdd, isLoading }) {
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (dayOfWeek && startTime && endTime) {
      onAdd({
        day_of_week: parseInt(dayOfWeek, 10),
        start_time: startTime,
        end_time: endTime,
      })
      setDayOfWeek('')
      setStartTime('')
      setEndTime('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor="day" className="text-black">Day</Label>
        <select
          id="day"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="w-[140px] h-10 px-3 rounded-md border border-gray-300 bg-white"
        >
          <option value="">Select day</option>
          {DAYS_OF_WEEK.map((day, index) => (
            <option key={index} value={index}>
              {day}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start" className="text-black">Start Time</Label>
        <select
          id="start"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-[120px] h-10 px-3 rounded-md border border-gray-300 bg-white"
        >
          <option value="">Start</option>
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="end" className="text-black">End Time</Label>
        <select
          id="end"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-[120px] h-10 px-3 rounded-md border border-gray-300 bg-white"
        >
          <option value="">End</option>
          {TIME_OPTIONS.filter((t) => t > startTime).map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      <Button 
        type="submit" 
        disabled={!dayOfWeek || !startTime || !endTime || isLoading}
        className="bg-[#5E5044] hover:bg-[#4a3f35]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Slot
      </Button>
    </form>
  )
}
