"use client"
import React, { useEffect, useState, useRef } from 'react'
// import { io } from 'socket.io-client'
import { useSearchParams } from "next/navigation";
import { useRouter } from 'next/navigation';
import socket from '../../../socket';
import Peer from 'simple-peer';

function Page({ params }) {
    const router = useRouter();
    // const [socket, setSocket] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [stream, setStream] = useState(null);
    const [peer, setPeer] = useState(null);
    
    // Use refs to store current values
    const userIdRef = useRef(null);
    const roomIdRef = useRef(null);
    const streamRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Update refs when states change
    useEffect(() => {
        userIdRef.current = currentUserId;
    }, [currentUserId]);

    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    useEffect(() => {
        streamRef.current = stream;
    }, [stream]);

    useEffect(() => {
        const getMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setStream(mediaStream);
                streamRef.current = mediaStream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
            }
        };

        getMedia();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const createPeer = (isInitiator) => {
        if (!streamRef.current || !roomIdRef.current || !userIdRef.current) {
            console.error("Missing required data for peer creation", {
                hasStream: !!streamRef.current,
                roomId: roomIdRef.current,
                userId: userIdRef.current
            });
            return null;
        }

        console.log("Creating peer", {
            isInitiator,
            roomId: roomIdRef.current,
            userId: userIdRef.current
        });

        const newPeer = new Peer({
            initiator: isInitiator,
            stream: streamRef.current,
            trickle: false,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        newPeer.on('signal', (signalData) => {
            console.log("Generating signal", {
                roomId: roomIdRef.current,
                userId: userIdRef.current
            });
            
            socket.emit('signal', {
                roomId: roomIdRef.current,
                userId: userIdRef.current,
                signal: signalData
            });
        });

        newPeer.on('stream', (remoteStream) => {
            console.log("Received remote stream");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        newPeer.on('connect', () => {
            console.log("Peer connection established");
        });

        newPeer.on('error', (err) => {
            console.error("Peer error:", err);
        });

        return newPeer;
    };

    useEffect(() => {
        if (!stream) return;

        const initializeRoom = async () => {
            try {
                const response = await fetch("/api/getCurrentUser");
                const userData = await response.json();
                const currentRoomId = params.roomId;

                setCurrentUserId(userData.userId);
                setRoomId(currentRoomId);
                
                userIdRef.current = userData.userId;
                roomIdRef.current = currentRoomId;

                // Clean up previous listeners
                socket.off("userJoined");
                socket.off("userLeft");
                socket.off("usersInRoom");
                socket.off("signalData");

                socket.on("usersInRoom", (users) => {
                    console.log("Users in room:", users);
                    setUsersInRoom(users);
                    
                    // If we're the second user, create peer
                    if (users.length === 2 && users[1] === userData.userId) {
                        const newPeer = createPeer(false);
                        if (newPeer) setPeer(newPeer);
                    }
                });

                socket.on("userJoined", (newUserId) => {
                    console.log("User joined:", { newUserId, currentUserId: userData.userId });
                    if (newUserId !== userData.userId && !peer) {
                        const newPeer = createPeer(true);
                        if (newPeer) setPeer(newPeer);
                    }
                });

                socket.on("userLeft", (leftUserId) => {
                    if (peer) {
                        peer.destroy();
                        setPeer(null);
                    }
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });

                socket.on("signalData", (data) => {
                    console.log("Received signal", {
                        from: data.userId,
                        currentUser: userData.userId
                    });
                    
                    if (data.userId !== userData.userId) {
                        if (!peer) {
                            const newPeer = createPeer(false);
                            if (newPeer) {
                                setPeer(newPeer);
                                newPeer.signal(data.signal);
                            }
                        } else {
                            peer.signal(data.signal);
                        }
                    }
                });

                // Join room
                socket.emit("joinRoom", currentRoomId, userData.userId);

            } catch (error) {
                console.error("Error initializing room:", error);
            }
        };

        initializeRoom();

        return () => {
            if (peer) {
                peer.destroy();
                setPeer(null);
            }
        };
    }, [stream]);

    return (
        <div className='flex flex-col items-center justify-center h-screen'>
            <h1 className='text-2xl font-bold'>Video Chat Room</h1>
            <p className='text-lg'>Room ID: {roomId}</p>
            <p className='text-lg'>User ID: {currentUserId}</p>
            <div className='flex flex-col items-center justify-center'>
                <p className='text-lg'>Users in Room:</p>
                {usersInRoom.map((user) => (
                    <p key={user}>{user}</p>
                ))}
            </div>
            <div className='flex flex-row items-center justify-center gap-4 my-4'>
                <div className='relative'>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className='w-64 h-48 border-2 border-blue-500 rounded-lg'
                    />
                    <p className='absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 text-white rounded'>You</p>
                </div>
                <div className='relative'>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className='w-64 h-48 border-2 border-green-500 rounded-lg'
                    />
                    <p className='absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 text-white rounded'>Peer</p>
                </div>
            </div>
            <div className='flex space-x-4 mt-4'>
                <button className='bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600'
                    onClick={() => {
                        if (peer) {
                            peer.destroy();
                            setPeer(null);
                        }
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        socket.emit("leaveRoom", roomId, currentUserId);
                        router.push("/videochat");
                    }}>
                    Leave Room
                </button>
            </div>
        </div>
    );
}

export default Page;
