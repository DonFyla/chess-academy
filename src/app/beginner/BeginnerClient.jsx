"use client";
import BeginnerCourseDetailPage from '@/components/home/BeginnerCourseDetail';
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";

export default function BeginnerClient() {
    return(
    <>
        <Navbar />
        <BeginnerCourseDetailPage />
        <Footer />
    </>)
}
