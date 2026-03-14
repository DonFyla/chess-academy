// Debug utilities for booking system
// Use these in browser console to test

import { supabase } from './supabase'

// Test if RPC functions exist
export async function testFunctions() {
  console.log('Testing database functions...')
  
  // Test 1: Check if functions exist
  const { data: functions, error } = await supabase
    .rpc('test_function_exists')
  
  if (error) {
    console.log('Function test failed:', error.message)
  }
  
  // Test 2: Direct SQL check
  const { data: list, error: listError } = await supabase
    .from('pg_proc')
    .select('proname')
    .in('proname', ['is_slot_available', 'get_coach_unified_schedule'])
  
  if (listError) {
    console.error('Cannot query pg_proc:', listError.message)
  } else {
    console.log('Found functions:', list)
  }
}

// Test unified schedule for a coach
export async function testUnifiedSchedule(coachId) {
  console.log('Testing unified schedule for coach:', coachId)
  
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const { data, error } = await supabase
      .rpc('get_coach_unified_schedule', {
        p_coach_id: coachId,
        p_start_date: today,
        p_days_ahead: 30
      })
    
    if (error) {
      console.error('RPC Error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      return null
    }
    
    console.log('Success! Found', data?.length || 0, 'bookings')
    console.log('Data:', data)
    return data
  } catch (e) {
    console.error('Exception:', e)
    return null
  }
}

// Test slot availability
export async function testSlotAvailability(coachId, date, startTime, endTime) {
  console.log('Testing slot availability:', { coachId, date, startTime, endTime })
  
  try {
    const { data, error } = await supabase
      .rpc('is_slot_available', {
        p_coach_id: coachId,
        p_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      })
    
    if (error) {
      console.error('RPC Error:', error)
      return null
    }
    
    console.log('Slot available:', data)
    return data
  } catch (e) {
    console.error('Exception:', e)
    return null
  }
}

// Manual fetch fallback test
export async function testManualFetch(coachId) {
  console.log('Testing manual fetch for coach:', coachId)
  
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch monthly bookings
  const { data: monthly, error: monthlyError } = await supabase
    .from('bookings')
    .select('*')
    .eq('coach_id', coachId)
    .not('status', 'in', '(rejected,cancelled)')
  
  if (monthlyError) {
    console.error('Monthly fetch error:', monthlyError)
  } else {
    console.log('Monthly bookings:', monthly?.length || 0)
    console.log('Sample:', monthly?.[0])
  }
  
  // Fetch point bookings
  const { data: points, error: pointsError } = await supabase
    .from('flexible_bookings')
    .select('*')
    .eq('coach_id', coachId)
    .in('status', ['confirmed', 'completed'])
    .gte('session_date', today)
  
  if (pointsError) {
    console.error('Points fetch error:', pointsError)
  } else {
    console.log('Point bookings:', points?.length || 0)
    console.log('Sample:', points?.[0])
  }
  
  return { monthly, points }
}

// Add this to window for console access
if (typeof window !== 'undefined') {
  window.debugBooking = {
    testFunctions,
    testUnifiedSchedule,
    testSlotAvailability,
    testManualFetch
  }
  console.log('Debug functions available at window.debugBooking')
  console.log('Try: await window.debugBooking.testManualFetch("your-coach-id")')
}
