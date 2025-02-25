"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    
    <div className="flex flex-col md:flex-row items-center justify-center h-screen w-screen bg-white">
      
    
      <img src="/bg.png" alt="bg" className="h-full w-full " />
      {/* Left Side (Buttons & Text) */}
      <div className="w-full md:w-1/2 ml-7 flex flex-col items-center md:items-start p-8">
        
        {/* Logo Placeholder */}
        <div className="w-64 h-32 center bg-gray-300 mb-9">
        <img src="/logo.png" alt="logo"/>
        </div>

        {/* Buttons */}
        <button 
          className="w-64 bg-blue-500 text-white py-3 text-lg rounded-full shadow-md mb-4 center hover:bg-blue-600"
          onClick={() => router.push('/videochat')}
        >
          Let's Connect
        </button>
        
       
        {/* Description */}
        <p className="mt-6 text-gray-600  text-lg font-bold text-center md:text-left">
          KooKuMeet brings you to connect people all over India region.     </p>
      
      <p className="mt-6 text-gray-600  pr-4 text-base font-normal text-center md:text-left">
      By incorporating unique features aimed at improving user experience, Kookoo Meet enables users to connect with strangers across India, with the added ability to select the opposite gender for video calls, thereby personalizing interactions to a significant degree.     </p>
      </div>

      {/* Right Side (Image) */}
      {/* <div className="w-full md:w-1/2 flex justify-center p-8">
        <Image 
          src="/bg_home.jpg" 
          alt="Video Chatting" 
          width={300} 
          height={200} 
          className="rounded-lg shadow-md object-cover"
        />
      </div> */}

  </div>
  );
}
