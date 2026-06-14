import AboutCourseCard from '../cards/BeginnerAboutCourseCard';
import TutorList from '../cards/BeginnerTutorList';

export default function BeginnerCourseDetailPage() {
    return (
        <div className="min-h-screen container bg-[#F5EFE7] px-5 py-10">

            {/* Hero Section
      <div className="relative overflow-hidden border-b border-black/10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <span className="hover:text-black cursor-pointer transition-colors">Courses</span>
                <span className="text-gray-600">/</span>
                <span className="hover:text-black cursor-pointer transition-colors">Development</span>
                <span className="text-gray-600">/</span>
                <span className="text-black">Advanced Web Architecture</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black tracking-tight leading-tight">
                Advanced Web <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Architecture
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
                Master scalable system design, microservices, and modern frontend architecture patterns 
                used by top tech companies.
              </p>
              
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 border-2 border-slate-900 flex items-center justify-center text-xs text-black font-medium">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">+2.4k enrolled</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    12 Weeks
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Intermediate
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-black text-slate-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors">
                Preview Course
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-black font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25">
                Enroll Now — $89
              </button>
            </div>
          </div>
        </div>
      </div> */}

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Course Content (wider) */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-black/5 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-8 h-1 bg-purple-500 rounded-full text-black"></span>
                                Curriculum
                            </h2>
                            <AboutCourseCard />
                        </div>

                        {/* Additional Course Info */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-6 bg-black/5 backdrop-blur-sm rounded-xl border border-black/10 hover:border-black/20 transition-colors">
                                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-black font-semibold mb-1">Access</h3>
                                <p className="text-gray-400 text-sm">Acess to world class coaches</p>
                            </div>

                            <div className="p-6 bg-black/5 backdrop-blur-sm rounded-xl border border-black/10 hover:border-black/20 transition-colors">
                                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <h3 className="text-black font-semibold mb-1">Compete</h3>
                                <p className="text-gray-400 text-sm">Register and compete in tournaments</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Tutor Info (narrower) */}
                    <div className="lg:col-span-3">
                        <div className="sticky top-8 space-y-6">
                            <div className="bg-black/5 backdrop-blur-sm rounded-2xl p-6 border border-black/10">
                                <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-pink-500/20 rounded-lg">
                                        <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </span>
                                    <div className='flex flex-col lg:flex'>
                                    Instructors
                                    <p className='lg:text-base lg:font-medium text-gray-500 text-sm font-mono'>Our Instructors are the best at what they do with lots of years of teaching experience and champions produced</p>

                                    </div>
                                    
                                </h2>
                                <TutorList />
                            </div>

                            {/* Quick Stats */}
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <div className="p-4 bg-black/5 rounded-xl border border-black/10 text-center">
                                    <div className="text-base font-serif text-black">By playing chess then, we may learn: First: Foresight. Second: circumspection. Third: Caution. And lastly, we learn by chess the habit of not being discouraged by present bad appearances in the state of our affairs, the habit of hoping for a favourable chance, and that of preserving in the secrets of resources.</div>
                                    <div className="text-xs text-gray-400">Benjamin Franklin</div>
                                </div>
                                {/* <div className="p-4 bg-black/5 rounded-xl border border-black/10 text-center">
                                    <div className="text-2xl font-bold text-black">8</div>
                                    <div className="text-xs text-gray-400">Experts</div>
                                </div> */}
                            </div>

                            {/* Trust Badges */}
                            <div className="p-6 bg-gradient-to-br from-purple-900/50 to-slate-900/50 rounded-xl border border-black/10 flex flex-col items-center">
                                <p className="text-center text-base font-semibold text-gray-800 mb-4">Make Champions of your Kids in every aspect of their lives. Begin that chess journey now!</p>
                                
                                <div className="flex flex-col gap-3 w-full">
                                    <a
                                        href="/book"
                                        className="px-4 py-3 bg-[#5E5044] text-white rounded-full w-fit text-center mx-auto hover:bg-[#4a3f35] transition-colors"
                                    >
                                        Book a Free Trial Session
                                    </a>
                                    <a
                                        href="https://wa.link/uj48gk"
                                        className="px-4 py-3 border-[#5E5044] border text-[#5E5044] rounded-full w-fit text-center mx-auto"
                                    >
                                        Chat on WhatsApp
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-black/10">
                <h2 className="text-3xl font-bold text-black text-center mb-12">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {[
                        { q: "Is this course suitable for someone without prior knowledge of chess?", a: "This course covers the very fundamentals of chess from what the pieces are, how they move to how they relate in battle. Guaranteed to get zero elo to 1500+ " },
                        { q: "What tools will I need?", a: "Just a computer and a stable internet connection ." },
                        { q: "Is there a testing class?", a: "Yes, we offer a one time free lesson to interested students." },
                        { q: "What are the benefits of online lessons", a: "1. Access to world class coaches 2. Instant access to databases containing millions of games 3. Automatic recording of games which make it easy to track student progress 4. Convenience" },
                        { q: "Will my child eventually get to play on the board?", a: "Absolutely, in fact, that is our end goal. We have consistently produced many champions who win tournaments over the board" }
                    ].map((faq, idx) => (
                        <div key={idx} className="p-6 bg-black/5 rounded-xl border border-black/10 hover:bg-black/[0.07] transition-colors cursor-pointer group">
                            <h3 className="text-black font-medium mb-2 group-hover:text-purple-400 transition-colors">{faq.q}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}