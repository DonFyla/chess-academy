'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, Target, Zap } from 'lucide-react'
import Link from 'next/link'

export default function QuizPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the popup
    const dismissed = localStorage.getItem('quiz-popup-dismissed')
    if (dismissed) {
      setHasBeenDismissed(true)
      return
    }

    // Show popup after 2 seconds
    const showTimer = setTimeout(() => {
      setIsOpen(true)
    }, 2000)

    return () => clearTimeout(showTimer)
  }, [])

  // Auto-dismiss after 8 seconds (optional - remove if you don't want this)
  useEffect(() => {
    if (!isOpen) return

    const hideTimer = setTimeout(() => {
      setIsOpen(false)
    }, 8000) // Auto-close after 8 seconds

    return () => clearTimeout(hideTimer)
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('quiz-popup-dismissed', 'true')
    setHasBeenDismissed(true)
    setIsOpen(false)
  }

  // Don't render if already dismissed
  if (hasBeenDismissed) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Centering Container */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {/* Popup Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 300,
                duration: 0.4 
              }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header with decorative gradient */}
                <div className="relative bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 p-6">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                    aria-label="Close popup"
                  >
                    <X size={24} />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Brain size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Discover Your Chess Level
                      </h2>
                      <p className="text-white/90 text-sm">
                        Take our quick assessment quiz
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-6 text-center">
                    Not sure which class is right for you? Our{' '}
                    <span className="font-semibold text-green-600">
                      2-minute skill assessment
                    </span>{' '}
                    will help identify your current level and recommend the perfect
                    starting point.
                  </p>

                  {/* Benefits */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-medium">
                        Personalized
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-medium">
                        Quick & Easy
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                      <Brain className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-medium">
                        Accurate
                      </p>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <Link
                      href="/quiz"
                      onClick={() => setIsOpen(false)}
                      className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-200"
                    >
                      Start Quick Quiz →
                    </Link>

                    <button
                      onClick={handleClose}
                      className="block w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      Maybe Later
                    </button>
                  </div>

                  {/* Dismiss option */}
                  <button
                    onClick={handleDismiss}
                    className="block w-full text-center text-gray-400 text-sm mt-4 hover:text-gray-600 transition-colors"
                  >
                    Don&apos;t show this again
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
