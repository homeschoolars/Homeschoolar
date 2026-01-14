-- Add PKR payment support to payments table
-- Run this after 006_subscriptions_notifications_analytics.sql

-- Add new columns to payments table for PKR payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for payment receipts bucket
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create pending PKR payments view for admin
CREATE OR REPLACE VIEW pending_pkr_payments AS
SELECT 
  p.id,
  p.user_id,
  pr.full_name,
  pr.email,
  p.amount,
  p.currency,
  p.payment_method,
  p.metadata,
  p.created_at,
  p.status
FROM payments p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.currency = 'PKR' AND p.status = 'pending'
ORDER BY p.created_at DESC;
