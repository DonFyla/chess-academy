"use client";
import Navbar from "../components/Navbar";
import Tutors from "@/components/home/Tutors";
import Events from "@/components/home/Events";
import Academy from "@/components/home/Academy";
import Header from "@/components/home/Header";
import AboutUs from "@/components/home/About-Us";
import Testimonial from "@/components/home/Testimonial";
import Footer from "@/components/Footer";
import Courses from "@/components/home/Courses";
import QuizApp from "@/components/home/Quiz";
// import Lenis from "@studio-freight/lenis";
// import { useEffect } from "react";

export default function Home() {
  // useEffect(() => {
  //   const lenis = new Lenis();

  //   // Check if the `window` object is available before using it
  //   if (typeof window !== "undefined") {
  //     lenis.on("scroll", (e) => {
  //       // console.log(e);
  //     });

  //     function raf(time) {
  //       lenis.raf(time);
  //       requestAnimationFrame(raf);
  //     }

  //     requestAnimationFrame(raf);
  //   }

  //   // Clean up the Lenis instance when the component unmounts
  //   return () => {
  //     lenis.destroy();
  //   };
  // }, []);
  return (
    <div>
      <Navbar />

      <Header />

      <AboutUs />

      <Testimonial />

      <Footer />
      {/* <QuizApp /> */}
    </div>
  );
}
