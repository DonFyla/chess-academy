"use client";
import Footer from "@/components/Footer";
import Tutors from "@/components/home/Tutors";
import Navbar from "@/components/Navbar";
import React from "react";

export default function TutorsClient() {
  return (
    <div>
      <Navbar />
      <div className="mb-6">
        <Tutors />
      </div>
      <Footer />
    </div>
  );
}
