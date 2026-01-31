"use client";
import ExpertCourseDetailPage from '@/components/home/ExpertCourseDetail';
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import React from "react";
import QuizApp from '@/components/home/BeginnerCourseDetail';

export default function CourseDetail() {
    return(
    <>
        <Navbar />
        <ExpertCourseDetailPage />
        <Footer />
    </>)
}