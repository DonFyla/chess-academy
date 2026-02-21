'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FaArrowRightLong } from 'react-icons/fa6'

export default function CoachCard({ coach }) {
  const initials = coach.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-xl w-fit bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Coach Photo */}
      <div className="w-full h-48 bg-gray-100 relative">
        {coach.photo_url ? (
          <Image
            src={coach.photo_url}
            alt={coach.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F5EFE7]">
            <span className="text-4xl font-bold text-[#5E5044]">{initials}</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        {/* Name and Specialization */}
        <h3 className="font-semibold text-lg mb-1 text-black">{coach.name}</h3>
        {coach.specialization && (
          <p className="text-sm text-gray-500 mb-2">{coach.specialization}</p>
        )}
        
        {/* Bio Preview */}
        {coach.bio && (
          <p className="text-xs text-gray-400 mb-4 line-clamp-2">
            {coach.bio}
          </p>
        )}
        
        {/* Action Links */}
        <div className="flex gap-4">
          <Link 
            href={`/tutors`}
            className="text-sm text-gray-600 hover:text-[#5E5044] flex items-center gap-1"
          >
            View Profile
          </Link>
          <Link 
            href={`/book/${coach.id}`}
            className="text-sm font-semibold text-[#5E5044] flex items-center gap-2 hover:gap-3 transition-all"
          >
            Book Session
            <FaArrowRightLong size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
