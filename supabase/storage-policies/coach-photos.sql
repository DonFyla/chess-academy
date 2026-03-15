-- Create storage bucket for coach photos
-- Run this in Supabase SQL Editor

-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-photos', 'coach-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view coach photos
CREATE POLICY "Coach photos are publicly viewable"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'coach-photos');

-- Policy: Coaches can upload their own photos
CREATE POLICY "Coaches can upload own photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'coach-photos'
        AND (
            -- Coach owns this folder (based on auth.uid)
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Or user is admin
            EXISTS (
                SELECT 1 FROM coaches 
                WHERE user_id = auth.uid() 
                AND is_admin = true
            )
        )
    );

-- Policy: Coaches can update their own photos
CREATE POLICY "Coaches can update own photos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'coach-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM coaches 
                WHERE user_id = auth.uid() 
                AND is_admin = true
            )
        )
    );

-- Policy: Coaches can delete their own photos
CREATE POLICY "Coaches can delete own photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'coach-photos'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM coaches 
                WHERE user_id = auth.uid() 
                AND is_admin = true
            )
        )
    );
