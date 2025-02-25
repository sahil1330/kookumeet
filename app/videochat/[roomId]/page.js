"use client"
import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useSearchParams } from "next/navigation";
import { useRouter } from 'next/navigation';

function Page({ params }) {

    const router = useRouter();
    const [socket, setSocket] = useState(null);
    const [userId, setUserId] = useState(null);
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        (async () => {
            const roomId = params.roomId;
            setRoomId(roomId);
            const response = await fetch("/api/getCurrentUser");
            const data = await response.json();
            setUserId(data.userId);
            const socket = io();
            setSocket(socket);
            console.log(socket, roomId, userId);

            socket.on("userJoined", (userId) => {
                console.log(userId);
            });
            socket.on("userLeft", (userId) => {
                console.log(userId);
            });
            socket.on("roomLeft", (roomId) => {
                console.log(roomId);
            });
            socket.on("roomFull", (roomId) => {
                console.log(roomId);
            });

            socket.emit("joinRoom", roomId, userId);
            socket.on("userJoined", (userId) => {
                console.log(userId);
            });
            socket.on("roomFull", (roomId) => {
                console.log(roomId);
            });

        })()
    }, []);

    return (
        <div className='flex flex-col items-center justify-center h-screen'>
            <h1 className='text-2xl font-bold'>Room</h1>
            <p className='text-lg'>Room ID: {roomId}</p>
            <p className='text-lg'>User ID: {userId}</p>
            <button className='bg-blue-500 text-white px-4 py-2 rounded-md' onClick={() => {
                socket.emit("leaveRoom", roomId, userId);
                router.push("/videochat");
            }}>Leave Room</button>
        </div>
    )
}

export default Page
