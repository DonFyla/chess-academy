'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useStorageUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = useCallback(async ({
    file,
    bucket = 'coach-photos',
    folder = '',
    onProgress
  }) => {
    if (!file) {
      throw new Error('No file provided')
    }

    setUploading(true)
    setProgress(0)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to upload')
      }

      // Create a unique file path
      const fileExt = file.name.split('.').pop().toLowerCase()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP)')
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB')
      }

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            )
            setProgress(percent)
            onProgress?.(percent)
          }
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      toast.success('Image uploaded successfully!')
      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload image')
      throw error
    } finally {
      setUploading(false)
    }
  }, [])

  const deleteFile = useCallback(async ({
    path,
    bucket = 'coach-photos'
  }) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
      
      toast.success('Image deleted')
      return true
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete image')
      throw error
    }
  }, [])

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress
  }
}
