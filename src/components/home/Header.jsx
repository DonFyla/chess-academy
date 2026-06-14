import React from "react";
import headerImage from "../../../public/images/others/header.svg";
import flags from "../../../public/images/others/flags.svg";

import Image from "next/image";

function Header() {
  return (
    <section className="container mx-auto px-6 ">
      <div className="flex gap-3 sm:gap-5 flex-col justify-center items-center">
        <p className="text-3xl text-center sm:text-5xl font-semibold">
          The Moving Train <br /> Online Chess Academy
        </p>
        <p className="text-lg sm:text-xl  text-center ">
          Our mission statement: <br />
          We will make your child fall in love with thinking.
        </p>
        <p className="text-center"></p>
        <a
          href="https://wa.link/uj48gk"
          className="px-4 py-3 bg-[#5E5044] text-white rounded-full"
        >
          Learn Now
        </a>
      </div>
      <div className="mx-auto mt-10 w-fit flex flex-col-reverse md:flex-row">
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
      </div>
    </section>
  );
}

export default Header;
