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

                    // First user creates offer when second user joins
                    if (users.length === 2) {
                        if (users[0] === userData.userId) {
                            console.log("Creating offer as first user");
                            const newPeer = new Peer({
                                initiator: true,
                                stream: streamRef.current,
                                trickle: false,
                                config: {
                                    iceServers: [
                                        { urls: 'stun:stun.l.google.com:19302' },
                                        { urls: 'stun:global.stun.twilio.com:3478' }
                                    ]
                                }
                            });
                            setPeer(newPeer);

                            newPeer.on('signal', (signalData) => {
                                console.log("Sending offer signal");
                                socket.emit('signal', {
                                    roomId: roomIdRef.current,
                                    userId: userIdRef.current,
                                    signal: signalData
                                });
                            });

                            newPeer.on('stream', (remoteStream) => {
                                console.log("Received remote stream as initiator");
                                if (remoteVideoRef.current) {
                                    remoteVideoRef.current.srcObject = remoteStream;
                                }
                            });
                        }
                    }
                    else {
                        const newPeer = new Peer({
                            initiator: false,
                            stream: streamRef.current,
                            trickle: true,
                            config: {
                                iceServers: [
                                    { urls: 'stun:stun.l.google.com:19302' },
                                    { urls: 'stun:global.stun.twilio.com:3478' },
                                    {
                                        urls: 'turn:numb.viagenie.ca',
                                        username: 'webrtc@live.com',
                                        credential: 'muazkh'
                                    }
                                ]
                            }
                        })
                        if (newPeer) setPeer(newPeer);
                        newPeer.on('signal', (signalData) => {
                           
                            newPeer.signal(signalData);
                        });

                        newPeer.on('stream', (remoteStream) => {
                            if (remoteVideoRef.current) {
                                remoteVideoRef.current.srcObject = remoteStream;
                            } else {
                                remoteVideoRef.current.src = URL.createObjectURL(remoteStream);
                            }
                            remoteVideoRef.current.play().catch(err => {
                                console.error("Error playing remote stream:", err);
                            });
                        });
                    }
                });

                socket.on("userLeft", (leftUserId) => {
                    console.log("User left:", leftUserId);
                    if (peer) {
                        peer.destroy();
                        setPeer(null);
                    }
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });

                socket.on("signalData", (data) => {
                    if (data.userId === userData.userId) return; // Ignore our own signals

                    console.log("Received signal", {
                        from: data.userId,
                        type: data.signal.type,
                        currentUser: userData.userId
                    });

                    try {
                        if (!peer && data.signal.type === 'offer') {
                            // Create peer for answerer
                            console.log("Creating peer as answerer");
                            const newPeer = new Peer({
                                initiator: false,
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
                                console.log("Sending answer signal");
                                socket.emit('signal', {
                                    roomId: roomIdRef.current,
                                    userId: userIdRef.current,
                                    signal: signalData
                                });
                            });

                            newPeer.on('stream', (remoteStream) => {
                                console.log("Received remote stream as answerer");
                                if (remoteVideoRef.current) {
                                    remoteVideoRef.current.srcObject = remoteStream;
                                }
                            });

                            setPeer(newPeer);
                            newPeer.signal(data.signal);
                        } else if (peer) {
                            peer.signal(data.signal);
                        }
                    } catch (error) {
                        console.error("Error handling signal:", error);
                        if (peer) {
                            peer.destroy();
                            setPeer(null);
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

    const createPeer = (isInitiator) => {
        if (!streamRef.current || !roomIdRef.current || !userIdRef.current) {
            console.error("Missing required data for peer creation");
            return null;
        }

        console.log("Creating peer", { isInitiator });

        const newPeer = new Peer({
            initiator: isInitiator,
            stream: streamRef.current,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: 'turn:numb.viagenie.ca',
                        username: 'webrtc@live.com',
                        credential: 'muazkh'
                    }
                ]
            }
        });

        newPeer.on('signal', (signalData) => {
            console.log("Generating signal", { type: signalData.type });
            socket.emit('signal', {
                roomId: roomIdRef.current,
                userId: userIdRef.current,
                signal: signalData
            });
        });

        newPeer.on('stream', (remoteStream) => {
            console.log("Received remote stream");
            if (remoteVideoRef.current && remoteStream.getVideoTracks().length > 0) {
                console.log("Setting remote video stream");
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play().catch(err => {
                    console.error("Error playing remote stream:", err);
                });
            }
        });

        newPeer.on('connect', () => {
            console.log("Peer connection established");
        });

        newPeer.on('error', (err) => {
            console.error("Peer error:", err);
            if (peer === newPeer) {
                newPeer.destroy();
                setPeer(null);
            }
        });

        newPeer.on('close', () => {
            console.log("Peer connection closed");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
            if (peer === newPeer) {
                setPeer(null);
            }
        });

        return newPeer;
    };

    return (
        <div className='flex flex-col items-center justify-center h-screen'>
            <h1 className='text-2xl font-bold'>Video Chat Room</h1>
            <p className='text-lg'>Room ID: {roomId}</p>
            <p className='text-lg'>User ID: {currentUserId}</p>
            <div className='flex flex-col items-center justify-center'>
                <p className='text-lg'>Users in Room:</p>
                {usersInRoom.length > 0 ? usersInRoom.map((user) => (
                    <p key={user}>{user}</p>
                )) : <p>{currentUserId}</p>}
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
