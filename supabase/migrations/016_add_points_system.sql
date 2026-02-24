-- POINTS SYSTEM MIGRATION
-- Flexible booking system where users buy points and use them to book classes

-- Add points_cost to coaches table (how many points per class)
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS points_cost INTEGER DEFAULT 1;  -- Normal coaches = 1 point, Special = 2-3 points

COMMENT ON COLUMN coaches.points_cost IS 'Number of points required per class (1 for normal, 2-3 for special)';

-- Create user_points table to track balance
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,  -- Points valid for 1 year from last purchase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Create point_transactions table for audit trail
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'expired')),
    amount INTEGER NOT NULL,  -- Positive for purchase/refund, negative for usage
    balance_after INTEGER NOT NULL,
    
    -- Related records
    booking_id UUID,  -- If this is related to a booking
    payment_reference TEXT,  -- For purchases
    
    -- Metadata
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,  -- When these points expire
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flexible_bookings table (points-based bookings)
CREATE TABLE IF NOT EXISTS flexible_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    
    -- Booking details
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Points used
    points_used INTEGER NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
    
    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    refund_processed BOOLEAN DEFAULT FALSE,
    
    -- Meeting link
    meeting_link TEXT,
    
    -- Notes
    coach_notes TEXT,
    student_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create coach_blocked_dates table
CREATE TABLE IF NOT EXISTS coach_blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    
    -- Block details
    blocked_date DATE NOT NULL,
    start_time TIME,  -- NULL = entire day blocked
    end_time TIME,    -- NULL = entire day blocked
    reason TEXT,      -- Optional reason ("Tournament", "Personal", etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(coach_id, blocked_date, start_time)  -- Prevent duplicate blocks
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(type);
CREATE INDEX IF NOT EXISTS idx_flexible_bookings_user_id ON flexible_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_flexible_bookings_coach_id ON flexible_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_flexible_bookings_date ON flexible_bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_flexible_bookings_status ON flexible_bookings(status);
CREATE INDEX IF NOT EXISTS idx_coach_blocked_dates_coach_id ON coach_blocked_dates(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_blocked_dates_date ON coach_blocked_dates(blocked_date);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flexible_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points"
    ON user_points
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all points"
    ON user_points
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- RLS Policies for point_transactions
CREATE POLICY "Users can view their own transactions"
    ON point_transactions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all transactions"
    ON point_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- RLS Policies for flexible_bookings
CREATE POLICY "Users can view their own bookings"
    ON flexible_bookings
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bookings"
    ON flexible_bookings
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookings"
    ON flexible_bookings
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Coaches can view their bookings"
    ON flexible_bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = flexible_bookings.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all flexible bookings"
    ON flexible_bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- RLS Policies for coach_blocked_dates
CREATE POLICY "Coaches can manage their own blocked dates"
    ON coach_blocked_dates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.id = coach_blocked_dates.coach_id 
            AND coaches.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view blocked dates"
    ON coach_blocked_dates
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage all blocked dates"
    ON coach_blocked_dates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM coaches 
            WHERE coaches.user_id = auth.uid() 
            AND coaches.is_admin = true
        )
    );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_user_points_updated_at
    BEFORE UPDATE ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flexible_bookings_updated_at
    BEFORE UPDATE ON flexible_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_points IS 'Tracks user point balances for flexible booking system';
COMMENT ON TABLE point_transactions IS 'Audit trail for all point purchases, usage, and refunds';
COMMENT ON TABLE flexible_bookings IS 'Individual class bookings using points (not recurring)';
COMMENT ON TABLE coach_blocked_dates IS 'Dates/times coaches block from being booked';
