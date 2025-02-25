import { useEffect, useState, useRef } from "react";
import { socket } from "@/socket";
import Peer from "simple-peer";

const useVideoChat = (gender) => {
  const [stream, setStream] = useState(null);
  const [partnerStream, setPartnerStream] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  // const socket = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
      });
    
    socket.emit("findPartner", { gender });

    socket.on("partnerFound", (id) => {
      const newPeer = new Peer({ initiator: true, trickle: false, stream });
      peer = newPeer;

      newPeer.on("signal", (signal) => {
        socket.emit("sendSignal", { userToSignal: id, callerId: socket.id, signal });
      });

      socket.on("receiveSignal", ({ signal, callerId }) => {
        const newPeer = new Peer({ initiator: false, trickle: false, stream });
        peer = newPeer;

        newPeer.signal(signal);

        newPeer.on("signal", (returnSignal) => {
          socket.emit("returnSignal", { signal: returnSignal, callerId });
        });

        newPeer.on("stream", setPartnerStream);
      });

      newPeer.on("stream", setPartnerStream);
    });

    return () => {
      peer?.destroy();
      socket?.disconnect();
    };
  }, [gender]);

  return { stream, partnerStream, skip: () => socket.emit("findPartner", { gender }) };
};

export default useVideoChat;
