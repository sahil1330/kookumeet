"use client"
import React, { useState, useEffect } from "react";
// import { io } from "socket.io-client";
import socket from "../../socket";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [gender, setGender] = useState(null);

  // const [socket, setSocket] = useState(null);
  const router = useRouter();

  const createRoom = async () => {
    const response = await fetch("/api/getCurrentUser");
    const data = await response.json();
    const userId = data.userId;
    console.log(userId);
    console.log("Create Room");
    const roomId = Math.random().toString(36).substring(2, 15);
    socket.emit("createRoom", roomId, userId)
    socket.on("roomCreated", (roomId) => {
      console.log(roomId);
      router.push(`/videochat/${roomId}`);
    });
  }
  const joinRoom = async () => {
    console.log("Join Room");
    const response = await fetch("/api/getCurrentUser");
    const data = await response.json();
    const userId = data.userId;
    console.log(userId);
    socket.emit("findRooms", userId)
    socket.on("roomsFound", (rooms) => {
      console.log(rooms);
      router.push(`/videochat/${rooms[0]}`);
    });
  }
  return (
    <div>
      {/* {!gender ? (
        <div className="flex flex-col  items-center justify-center h-screen">
          <h1 className="text-white text-2xl mb-4">Choose Gender</h1> 
          <div className="flex flex-row items-center justify-center"> 
          <div className="flex flex-col items-center"> 
              <img src="/Male_icon.png" alt="Male" className="h-40 w-40 mb-2" />
              <button
                className="px-6 mx-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setGender("male")}
              >
                ‎  Talk to Males ‎ 
              </button>
            </div>
            <div className="flex flex-col items-center"> 
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
      )} */}

      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-white text-2xl mb-4">Create or Join a Room</h1>
        <div className="flex flex-row items-center justify-center">
          <button onClick={() => createRoom()} className="px-6 mx-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Create Room</button>
          <button onClick={() => joinRoom()} className="px-6 mx-3 py-2 bg-pink-500 text-white rounded hover:bg-pink-600">Join Room</button>
        </div>
      </div>
    </div>
  );
}