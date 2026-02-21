"use client";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

import logo from "../../public/images/others/logo.svg";

function Navbar() {
  const router = useRouter();
  const { user, signOut, isCoach, isAdmin } = useAuth();
  const [Open, setOpen] = useState(false);

  const handleClick = () => {
    if (Open) {
      setOpen(false);
      document.body.classList.remove("stopScroll");
    } else {
      setOpen(true);
      document.body.classList.add("stopScroll");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const baseTabs = [
    { link: "/#", name: "Home" },
    { link: "/#about-us", name: "About Us" },
    { link: "/courses", name: "Courses" },
    { link: "/tutors", name: "Tutors" },
    { link: "/book", name: "Book a Session" },
    { link: "/gallery", name: "Gallery" },
    { link: "/#contact-us", name: "Contact Us" },
    { link: "/quiz", name: "Quiz" },
  ];

  // Add role-specific links
  const tabs = [...baseTabs];
  
  if (isAdmin()) {
    tabs.push({ link: "/admin/schedule", name: "Admin" });
  }
  
  if (isCoach()) {
    tabs.push({ link: "/coach/availability", name: "My Schedule" });
  }

  const isActive = (pathname) => router.pathname === pathname;

  return (
    <section className="h-full w-full bg-white relative z-[500]">
      <div className="w-full h-[130px]"></div>
      <main className="items-center fixed top-0 left-0 right-0 bg-white w-full py-8 px-8 md:px-4 h-[100px] flex flex-row justify-between border-b-[1px]">
        <Link href="/">
          <Image alt="Logo" src={logo} height={60} width={60} />
        </Link>

        <div className="items-center text-sm mt-3 md:flex flex-row font-semibold space-x-4 hidden">
          {tabs.map((item) => (
            <a
              onClick={() => {
                if (item.name === "Home") {
                  document.body.scrollTop = 0;
                  document.documentElement.scrollTop = 0;
                }
              }}
              key={item.name}
              href={item.link}
              className="transition ease-in-out duration-700 relative px-3 py-1"
            >
              {isActive(item.link) && (
                <motion.div
                  transition={{ duration: 0.5 }}
                  style={{ borderRadius: 9999 }}
                  layoutId="active-pill"
                  className="bg-[#5E5044] absolute inset-0"
                />
              )}
              <span className="relative z-10">{item.name}</span>
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-600">
                {user.user_metadata?.full_name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-3 border-[#5E5044] border text-[#5E5044] rounded-full hover:bg-[#5E5044] hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/book"
                className="px-4 py-3 bg-[#5E5044] text-white rounded-full hover:bg-[#4a3f35] transition-colors"
              >
                Book a Session
              </Link>
              <Link
                href="/login"
                className="px-4 py-3 border-[#5E5044] border text-[#5E5044] rounded-full hover:bg-[#5E5044] hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden gap-6 h-fit">
          <button
            onClick={handleClick}
            className="bg-orange md:hidden focus:outline-none hover:text-[#5E5044] transition ease-in-out duration-700 flex items-center z-[999]"
          >
            <span className="w-8 h-8">
              {!Open ? <FaBars size={30} /> : <FaTimes size={30} />}
            </span>
          </button>
        </div>
      </main>

      <aside>
        <div
          onClick={() => {
            setOpen(false);
            document.body.classList.remove("stopScroll");
          }}
          className={`duration-500 md:hidden ${
            Open
              ? "bg-black/60 fixed !top-0 z-[1000] inset-0 opacity-100"
              : "opacity-0"
          }`}
        ></div>
        <div className="md:hidden">
          <div
            className={`z-[1000] duration-1000 p-10 bg-black fixed top-0 left-0 right-1/3 bottom-0 ${
              Open ? "bg-white" : "bg-white -translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full items-center text-lg gap-12 mt-6 text-gray-500 font-semibold leading-tight">
              {tabs.map((item) => (
                <a
                  onClick={() => {
                    setOpen(false);
                    if (item.name === "Home") {
                      document.body.scrollTop = 0;
                      document.documentElement.scrollTop = 0;
                    }
                  }}
                  key={item.name}
                  href={item.link}
                  className={`transition ease-in-out duration-700 px-3 py-1 ${
                    isActive(item.link) ? "bg-[#5E5044] text-white" : ""
                  }`}
                >
                  {item.name}
                </a>
              ))}
              
              {/* Mobile auth buttons */}
              {user ? (
                <button
                  onClick={() => {
                    handleSignOut();
                    setOpen(false);
                  }}
                  className="px-4 py-2 bg-[#5E5044] text-white rounded-full"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 border-[#5E5044] border text-[#5E5044] rounded-full"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}

export default Navbar;
