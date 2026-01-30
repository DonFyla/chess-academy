"use client";

import { useState } from 'react';

function AboutCourseCard() {
  const [openIndex, setOpenIndex] = useState(0); // First item open by default, or null for all closed

  const categories = [
    {
      id: 1,
      title: "Mates",
      icon: (
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      ),
      gradient: "from-purple-500 to-pink-500",
      items: ["Pieces and their movements", "Checks", " Basic Checkmates", "Mate in One"],
      dotColor: "bg-purple-400"
    },
    {
      id: 2,
      title: "Opening Principles",
      icon: (
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      ),
      gradient: "from-blue-500 to-cyan-500",
      items: ["Development", "Threat considerations", "Attack"],
      dotColor: "bg-blue-400"
    },
    {
      id: 3,
      title: "Tactics",
      icon: (
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-500",
      items: ["Pins", "Skewers", "Forks", "Double attack", "Discovered attack"],
      dotColor: "bg-emerald-400"
    },
    {
      id: 4,
      title: "Resources",
      icon: (
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      ),
      gradient: "from-orange-500 to-red-500",
      items: ["500-chess-exercises-special-mate-in-1-move.pdf",],
      dotColor: "bg-orange-400"
    }
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index); // Toggle off if clicking open one, or null to allow multiple
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-2 tracking-tight">
          Road to 1500 Elo
        </h1>
        <p className="text-black text-sm md:text-base">
          Click to expand modules
        </p>
      </div>

      {/* Accordion Container */}
      <div className="space-y-3">
        {categories.map((category, index) => {
          const isOpen = openIndex === index;
          
          return (
            <div 
              key={category.id}
              className={`group rounded-xl overflow-hidden bg-black/5 backdrop-blur-lg border border-black/10 shadow-xl hover:border-black/20 transition-all duration-300 ${isOpen ? 'ring-2 ring-amber-800' : ''}`}
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-gradient-to-br ${category.gradient} rounded-lg shadow-lg`}>
                    {category.icon}
                  </div>
                  <span className="text-lg font-semibold text-black tracking-wide">
                    {category.title}
                  </span>
                </div>
                <svg 
                  className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-5 pb-5 pt-0">
                  <ul className="space-y-2 ml-12">
                    {category.items.map((item, itemIndex) => (
                      <li 
                        key={itemIndex}
                        className="flex items-center gap-3 text-gray-800 hover:text-black transition-colors cursor-pointer group/item"
                      >
                        <span className={`w-1.5 h-1.5 ${category.dotColor} rounded-full group-hover/item:scale-125 transition-transform`}></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AboutCourseCard;