"use client";
import BeginnerCourseDetailPage from '@/components/home/BeginnerCourseDetail';
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";
import QuizApp from '@/components/home/BeginnerCourseDetail';

export default function CourseDetail() {
    return(
    <>
        <Navbar />
        <BeginnerCourseDetailPage />
        <Footer />
    </>)
}