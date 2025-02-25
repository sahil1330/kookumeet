"use client"
import React, { useState, useEffect } from "react";
import VideoChat from "@/components/VideoChat";


export default function HomePage() {
  const [gender, setGender] = useState(null);

  return (
    <div>
      {!gender ? (
        <div className="flex flex-col  items-center justify-center h-screen">
          <h1 className="text-white text-2xl mb-4">Choose Gender</h1> 
          <div className="flex flex-row items-center justify-center"> 
          <div className="flex flex-col items-center"> {/* Container for icon and button */}
              <img src="/Male_icon.png" alt="Male" className="h-40 w-40 mb-2" />
              <button
                className="px-6 mx-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setGender("male")}
              >
                ‎  Talk to Males ‎ 
              </button>
            </div>
            <div className="flex flex-col items-center"> {/* Container for icon and button */}
              <img src="/Female_icon.png" alt="Female" className="h-40 w-40 mb-2" />
              <button
                className="px-6 mx-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
                onClick={() => setGender("female")}
              >
                Talk to Females
              </button>
            </div>
            
          </div>
        </div>
      ) : (
        <VideoChat gender={gender} />
      )}
    </div>
  );
}