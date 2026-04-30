'use client'

import { useState, useCallback } from 'react'

/**
 * Hook for initiating Paystack payments using @paystack/inline-js
 * 
 * Usage:
 * const { initializePayment, isLoading } = usePaystackPayment()
 * 
 * await initializePayment({
 *   email: 'customer@example.com',
 *   amount: 10000, // Amount in Naira (NOT kobo - hook converts to kobo)
 *   reference: 'UNIQUE_REF_123',
 *   metadata: { type: 'points_purchase', user_id: '...' },
 *   onSuccess: (transaction) => { ... },
 *   onCancel: () => { ... },
 *   onError: (error) => { ... },
 * })
 */
export function usePaystackPayment() {
  const [isLoading, setIsLoading] = useState(false)

  const initializePayment = useCallback(async ({
    email,
    amount,
    reference,
    metadata = {},
    onSuccess,
    onCancel,
    onError,
  }) => {
    setIsLoading(true)

    try {
      const PaystackPop = (await import('@paystack/inline-js')).default

      const popup = new PaystackPop()

      popup.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.round(amount * 100), // Convert Naira to kobo
        reference,
        metadata,
        onSuccess: (transaction) => {
          setIsLoading(false)
          onSuccess?.(transaction)
        },
        onCancel: () => {
          setIsLoading(false)
          onCancel?.()
        },
        onError: (error) => {
          setIsLoading(false)
          onError?.(error)
        },
      })
    } catch (error) {
      setIsLoading(false)
      console.error('Paystack initialization error:', error)
      onError?.(error)
    }
  }, [])

  return { initializePayment, isLoading }
}
