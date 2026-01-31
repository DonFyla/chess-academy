"use client";

import { useState } from 'react';

function AboutCourseTutorCard() {
  const [openSection, setOpenSection] = useState('about'); // 'about', 'expertise', or null

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const tutor = {
    name: "Dr. Sarah Chen",
    role: "Senior Web Architect",
    rating: 4.9,
    reviews: 128,
    students: "2.4k",
    courses: 12,
    avatar: null, // Set to image URL or null for initials fallback
    initials: "SC",
    color: "from-violet-500 to-purple-600"
  };

  const expertise = [
    "React & Next.js Architecture",
    "System Design",
    "TypeScript Advanced Patterns",
    "Cloud Infrastructure (AWS)",
    "Performance Optimization"
  ];

  const education = [
    { degree: "Ph.D. Computer Science", school: "MIT", year: "2018" },
    { degree: "M.S. Software Engineering", school: "Stanford", year: "2014" }
  ];

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="bg-black/5 backdrop-blur-xl border border-black/10 rounded-2xl overflow-hidden shadow-2xl hover:border-black/20 transition-all duration-300">
        
        {/* Header Profile Section */}
        <div className="p-6 border-b border-black/10">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${tutor.color} flex items-center justify-center text-2xl font-bold text-black shadow-lg flex-shrink-0`}>
              {tutor.avatar ? (
                <img src={tutor.avatar} alt={tutor.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                tutor.initials
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-black truncate">{tutor.name}</h2>
                  <p className="text-purple-200/80 text-sm font-medium">{tutor.role}</p>
                </div>
                <div className="flex items-center gap-1 bg-black/10 px-2 py-1 rounded-lg">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-black font-semibold text-sm">{tutor.rating}</span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {tutor.students} students
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {tutor.courses} courses
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {tutor.reviews} reviews
                </span>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <button className="w-full mt-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-black font-semibold py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]">
            Book Session
          </button>
        </div>

        {/* Accordion Sections */}
        <div className="divide-y divide-black/10">
          
          {/* About Section */}
          <div className="group">
            <button 
              onClick={() => toggleSection('about')}
              className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-black font-medium">About</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${openSection === 'about' ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'about' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 pt-0">
                <p className="text-gray-300 text-sm leading-relaxed pl-12">
                  Former principal engineer at Google with 10+ years of experience building scalable web applications. 
                  Specialized in mentoring senior developers transitioning to architecture roles. Passionate about 
                  clean code, design patterns, and developer experience.
                </p>
              </div>
            </div>
          </div>

          {/* Expertise Section */}
          <div className="group">
            <button 
              onClick={() => toggleSection('expertise')}
              className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-black font-medium">Expertise</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${openSection === 'expertise' ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'expertise' ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 pt-0 pl-12">
                <div className="flex flex-wrap gap-2">
                  {expertise.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1.5 bg-black/10 hover:bg-black/20 text-gray-300 text-xs rounded-full border border-black/10 transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Education Section */}
          <div className="group">
            <button 
              onClick={() => toggleSection('education')}
              className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <span className="text-black font-medium">Education</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${openSection === 'education' ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSection === 'education' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 pt-0 pl-12 space-y-3">
                {education.map((edu, index) => (
                  <div key={index} className="border-l-2 border-orange-400/30 pl-3">
                    <p className="text-black text-sm font-medium">{edu.degree}</p>
                    <p className="text-gray-400 text-xs">{edu.school} • {edu.year}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AboutCourseTutorCard;