"use client";

function ExpertTutorList() {
  const tutors = [
    {
        id: 1,
        name: "Coach Akintoye",
        role: "Chess Master, Lawyer",
        initials: "AAA",
        color: "from-pink-500 to-rose-500",
        rating: 4.9,
        // students: "75"
      },
      {
        id: 2,
        name: "Coach Rotimi",
        role: "Chess Master, Engineer",
        initials: "OL",
        color: "from-emerald-500 to-teal-500",
        rating: 4.9,
        // students: "40"
      },

      {
        id: 3,
        name: "Coach Akintoye",
        role: "Chess Master, Lawyer",
        initials: "AAA",
        color: "from-blue-500 to-cyan-500",
        rating: 4.9,
        // students: "75"
      },
    
    
    
    
  ];

  return (
    <div className="space-y-3">
      {tutors.map((tutor) => (
        <div 
          key={tutor.id}
          className="group flex items-center gap-3 p-3 rounded-xl bg-black/5 border border-black/10 hover:bg-black/10 hover:border-black/20 transition-all duration-300 cursor-pointer"
        >
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${tutor.color} flex items-center justify-center text-sm font-bold text-black shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
            {tutor.initials}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-black font-semibold text-sm truncate group-hover:text-gray-900 transition-colors">
              {tutor.name}
            </h3>
            <p className="text-gray-400 text-xs truncate">{tutor.role}</p>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-xs">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-black font-medium">{tutor.rating}</span>
            </div>
            {/* <span className="text-[10px] text-gray-500">{tutor.students} students</span> */}
          </div>

          {/* Book Coach Button */}
          <a
            href="/book"
            className="px-3 py-1.5 text-xs font-medium bg-[#5E5044] text-white rounded-full hover:bg-[#4a3f35] transition-colors whitespace-nowrap"
          >
            Book Coach
          </a>
        </div>
      ))}
      
      {/* <button className="w-full mt-2 py-2 text-sm text-green-800 hover:text-black border border-black/10 hover:bg-black/5 rounded-lg transition-colors">
        Click here to see what the Nigerian number one player has to say
      </button> */}
    </div>
  );
}

export default ExpertTutorList;