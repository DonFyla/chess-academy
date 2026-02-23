"use client";
import Footer from "@/components/Footer";
import Courses from "@/components/home/Courses";
import Navbar from "@/components/Navbar";
import React from "react";

export default function CoursesClient() {
  return (
    <>
      <Navbar />
      <Courses />
      <Footer />
    </>
  );
}
