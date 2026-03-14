-- Add status to point_transactions for pending purchases
-- This allows tracking of pending -> confirmed flow

-- Add status column if not exists
ALTER TABLE point_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

COMMENT ON COLUMN point_transactions.status IS 'Status of the transaction: pending (awaiting payment), completed, failed, or cancelled';

-- Create index for filtering pending transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_status ON point_transactions(status);

-- Create view for pending points purchases
CREATE OR REPLACE VIEW pending_points_purchases AS
SELECT 
  pt.id,
  pt.user_id,
  pt.amount as points_amount,
  pt.payment_reference,
  pt.description,
  pt.created_at,
  pt.expires_at,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name
FROM point_transactions pt
JOIN auth.users u ON pt.user_id = u.id
WHERE pt.type = 'purchase' AND pt.status = 'pending'
ORDER BY pt.created_at DESC;

-- Function for admin to confirm points purchase
CREATE OR REPLACE FUNCTION confirm_points_purchase(
  p_transaction_id UUID,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_user_id UUID;
  v_points INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check if admin
  IF NOT EXISTS (
    SELECT 1 FROM coaches 
    WHERE user_id = p_admin_user_id AND is_admin = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get transaction
  SELECT * INTO v_transaction 
  FROM point_transactions 
  WHERE id = p_transaction_id AND type = 'purchase' AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or already processed');
  END IF;
  
  v_user_id := v_transaction.user_id;
  v_points := v_transaction.amount;
  
  -- Get or create user_points
  SELECT balance INTO v_current_balance 
  FROM user_points 
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    v_current_balance := 0;
    INSERT INTO user_points (user_id, balance, total_purchased, total_used, expires_at)
    VALUES (v_user_id, v_points, v_points, 0, NOW() + INTERVAL '1 year');
  ELSE
    v_new_balance := v_current_balance + v_points;
    UPDATE user_points 
    SET 
      balance = v_new_balance,
      total_purchased = total_purchased + v_points,
      updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;
  
  -- Update transaction status
  UPDATE point_transactions 
  SET status = 'completed'
  WHERE id = p_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'points_added', v_points,
    'new_balance', COALESCE(v_new_balance, v_points)
  );
END;
$$;
