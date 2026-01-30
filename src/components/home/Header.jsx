import React from "react";
import headerImage from "../../../public/images/others/header.svg";
import flags from "../../../public/images/others/flags.svg";
import MediaCarousel from "../cards/MediaCarousel";
import { mixedItems } from "@/data";

import Image from "next/image";

function Header() {
  return (
    <>
    <section className="container mx-auto px-6 ">
      <div className="flex gap-3 sm:gap-5 flex-col justify-center items-center">
        <p className="text-3xl text-center sm:text-5xl font-semibold">
          The Moving Train <br /> Online Chess Academy
        </p>
       
        <p className="text-lg sm:text-xl  text-center ">
          We take Special Delight in preparing our Students for greatness. No
          excuses!!! <br />
          {`  We're a journey from novice to mastery. Join us on the tracks of chess
          excellence as we guide you through every move, every strategy, and
          every triumph.`}
        </p>
        <p className="text-center"></p>
        <a
          href="/quiz"
          className="px-4 py-3  lg:mt-[-30px]  lg:mb-[10px] bg-blue-900 text-white rounded-full text-center"
        >
          Want to know your chess level? Take a quick quick Quiz😎
        </a>
      </div>
      {/* <div className="mx-auto mt-10 w-fit flex flex-col-reverse md:flex-row">
        <Image
          alt="headerImage"
          src={headerImage}
          width={500}
          height={500}
        ></Image>
        <div className="flex justify-end">
          <Image
            className="bg-[#5D5B58]/25 h-fit p-5 shadow-md shadow-[#5D5B58]/50 rounded-xl my-auto w-1/3 md:w-full md:-ml-20 ml-10 -mb-40 md:mb-96 ju -z-10 "
            alt="flags"
            src={flags}
            width={200}
            height={200}
          ></Image>
        </div>
      </div> */}
       
    </section>
    <MediaCarousel
    items={mixedItems}
    autoPlay={true}
    interval={6000}
    showThumbnails={true}
    
  />
  </>

  );
}

export default Header;
