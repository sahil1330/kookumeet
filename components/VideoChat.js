import React, { useRef, useEffect, useState } from "react";
import useVideoChat from "../hooks/useVideoChat";
import { useRouter } from 'next/navigation';

const VideoChat = ({ gender }) => {
  const { stream, partnerStream, skip } = useVideoChat(gender);
  const userVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (userVideoRef.current && stream) {
      userVideoRef.current.srcObject = stream;
    }
    if (partnerVideoRef.current && partnerStream) {
      partnerVideoRef.current.srcObject = partnerStream;
    }
  }, [stream, partnerStream]);

  const handleBack = () => {
     window.location.reload();
  };
  const handleSkip = () => {
     //Refresh instead of going to skip function
  };

  const handleSendMessage = () => {
    if (newMessage.trim() !== "") {
      setMessages([...messages, { text: newMessage, sender: "me" }]);
      setNewMessage("");
      // In a real application, you'd send this message over a WebSocket
      // or some other real-time communication channel to the other user.
    }
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Video Section */}
      <div className="w-3/4 flex flex-col p-6">
        {/* Partner Video */}
        <div className="border-2 border-blue-500 rounded-xl mb-10">
          {/* Added styling */}
          <div className="bg-black w-full  h-80 flex rounded-xl items-center justify-center">
            <video
              ref={partnerVideoRef}
              autoPlay
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        </div>

        {/* Local User Video */}
        <div className=" mb-10 border-2 w-1/3 border-yellow-500 rounded-xl ">
          {/* Added styling */}
          <div className="bg-black w-full h-40 flex rounded-xl items-center justify-center">
            <video
              ref={userVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          </div>
        
        {/* Buttons */}
        <div className="flex justify-between items-center  ">
          <button
            className="px-4 py-2 bg-green-300 rounded text-gray-700 font-semibold"
            onClick={() => router.push("/page.js")}
          >
            Change Gender ♀♂
          </button>
          <div className="space-x-2">
            <button
              className="px-6 py-2 bg-red-300 rounded text-gray-700 font-semibold"
              onClick={handleBack}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 bg-blue-300 rounded text-gray-700 font-semibold"
              onClick={handleSkip}
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Black Divider */}
      <div className="bg-black w-1"></div>

      {/* Chatbox Section */}
      <div
        className="w-1/2 flex flex-col p-4 rounded-lg"
        style={{
          backgroundImage: "url('/background_chat.jpg')",
          backgroundSize: "cover", // or 'contain', '100% 100%', etc.
          backgroundRepeat: "no-repeat",
          backgroundColor: "#D3D3D3",
        }}
      >
        <div className="flex-grow overflow-y-auto p-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-2 rounded-lg p-2 max-w-xs ${
                message.sender === "me" ? "bg-teal-300 ml-auto text-black" : "bg-gray-400 mr-auto"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="flex items-center p-2 mt-4 bg-blue-700 rounded-lg">
          <input
            type="text"
            className="flex-grow rounded-lg py-2 px-3 text-black"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <button
            className="ml-2 px-4 py-2 bg-blue-500 text-black rounded-lg hover:bg-blue-600"
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;