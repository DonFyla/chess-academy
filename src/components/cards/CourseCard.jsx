"use client";
import Image from "next/image";
import React from "react";
import { FaArrowRightLong } from "react-icons/fa6";
import { IoStar } from "react-icons/io5";
import beginner from "../../../public/images/courses/course-beginner.svg";

function CourseCard({ course }) {
  const path = "course-beginner";
  return (
    <div className=" rounded-xl w-fit">
      <div className="w-full mx-auto">{course.image}</div>
      <div className="bg-white p-2 rounded-b-xl">
        <div className="flex justify-between items-center">
          <p className="font-semibold">{course.type}</p>
          <div className="flex">
            <IoStar size={15} />
            <IoStar size={15} /> <IoStar size={15} /> <IoStar size={15} />
            <IoStar size={15} />
          </div>
        </div>
        <p className=" text-xs md:text-sm my-2 ">{course.details}</p>
        <a href={course.link} className="flex gap-2 items-center">
          <span className="text-sm font-semibold">Enter</span>
          <FaArrowRightLong size={20} />
        </a>
      </div>
    </div>
  );
}

export default CourseCard;
