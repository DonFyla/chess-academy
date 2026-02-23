-- Create special bookings table for per-session bookings
CREATE TABLE IF NOT EXISTS special_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Student info
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_phone TEXT,
    
    -- Booking details
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    sessions_completed INTEGER DEFAULT 0,
    
    -- Selected session dates (array of date/time slots)
    session_dates JSONB NOT NULL DEFAULT '[]',
    -- Example: [
    --   {"date": "2026-03-01", "start_time": "10:00", "end_time": "11:00", "day_of_week": 6},
    --   {"date": "2026-03-08", "start_time": "10:00", "end_time": "11:00", "day_of_week": 6}
    -- ]
    
    -- Recurring pattern (optional)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days INTEGER[], -- Days of week [1, 3] for Mon, Wed
    recurring_weeks INTEGER DEFAULT 4, -- How many weeks to repeat
    
    -- Pricing
    hourly_rate INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_received', 'confirmed', 'completed', 'cancelled')),
    
    -- Payment details
    payment_method TEXT,
    payment_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Admin notes
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_special_bookings_coach ON special_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_special_bookings_student ON special_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_special_bookings_status ON special_bookings(status);

-- Enable RLS
ALTER TABLE special_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own special bookings"
    ON special_bookings
    FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Anyone can create special bookings"
    ON special_bookings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all special bookings"
    ON special_bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_special_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_special_bookings_updated_at
    BEFORE UPDATE ON special_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_special_bookings_updated_at();
