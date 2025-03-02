import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import Room from "./models/room.model.js";
import connectToDB from "./lib/connectToDB.js";
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);
  let users = [];
  let socketToRoom = new Map(); // Track which socket is in which room
  let socketToUser = new Map(); // Track which socket belongs to which user

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    connectToDB();
    socket.on("createRoom", async (roomId, userId) => {
      console.log("Creating room:", roomId, "for user:", userId);
      try {
        const existingRoom = await Room.findOne({
          users: { $elemMatch: { $eq: userId } }
        });

        if (existingRoom) {
          console.log("User already in room:", existingRoom.roomId);
          io.to(socket.id).emit("roomCreated", existingRoom.roomId);
          return;
        }

        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        socketToUser.set(socket.id, userId);

        const room = new Room({
          roomId: roomId,
          users: [userId], // Add user directly
          status: "active"
        });

        await room.save();
        console.log("New room created with users:", room.users);
        io.to(socket.id).emit("roomCreated", roomId);
      } catch (error) {
        console.error("Error creating room:", error);
      }
    });

    socket.on("findRooms", async (userId) => {
      console.log("Finding room for user:", userId);
      console.log("Socket ID:", socket.id);
      const room = await Room.find({ status: "active" }).sort({ createdAt: -1 });
      console.log("Found rooms:", room, "for user:", userId);
      if (room.length === 0) {
        io.to(socket.id).emit("noRoomsFound");
      } else {
        io.to(socket.id).emit("roomsFound", room.map(r => r.roomId));
      }
    });

    socket.on("joinRoom", async (roomId, userId) => {
      console.log("Joining room:", roomId, "for user:", userId);
      try {
        const userInRoom = await Room.findOne({
          users: { $elemMatch: { $eq: userId } }
        });
        console.log("User in room:", userInRoom);
        if (userInRoom) {
          console.log("User already in room:", userInRoom.roomId);
          io.to(socket.id).emit("userJoined", userInRoom.roomId, userId);
          return;
        }

        const room = await Room.findOne({ roomId: roomId });
        console.log("Room:", room);
        if (!room) {
          console.log("Room not found:", roomId);
          io.to(socket.id).emit("roomNotFound");
          return;
        }

        // Clean array and add new user
        room.users = room.users.filter(user => user != null);
        console.log("Room users:", room.users);
        if (room.users.length >= 2) {
          console.log("Room full:", roomId);
          io.to(socket.id).emit("roomFull", roomId);
          return;
        }

        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        socketToUser.set(socket.id, userId);

        room.users.push(userId);
        room.status = room.users.length === 2 ? "full" : "active";
        await room.save();

        console.log("Updated room users:", room.users);
        io.to(roomId).emit("userJoined", userId);
        io.to(roomId).emit("usersInRoom", room.users);
      } catch (error) {
        console.error("Error joining room:", error);
      }
    });

    socket.on("userJoined", async (roomId, userId) => {
      const room = await Room.findOne({ roomId: roomId });
      room.users.push(userId);
      room.status = "full";
      await room.save();
      if (!room.users.includes(userId)) {
        throw new Error("Error joining room");
      }
      console.log("User joined:", userId);
      io.to(roomId).emit("userJoined", userId);
      io.to(roomId).emit("usersInRoom", room.users);
    });

    socket.on("leaveRoom", async (roomId, userId) => {
      console.log("Leaving room:", roomId);
      io.to(socket.id).emit("roomLeft", roomId);
      io.to(roomId).emit("userLeft", userId);
      const room = await Room.findOne({ roomId: roomId });
      room.users = room.users.filter((user) => user !== userId);
      room.status = "active";
      if (room.users.length === 0) {
        await Room.deleteOne({ roomId: roomId });
      } else {
        await room.save();
      }
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);
      // Clean up the room when user disconnects
      const roomId = socketToRoom.get(socket.id);
      const userId = socketToUser.get(socket.id);

      if (roomId && userId) {
        const room = await Room.findOne({ roomId: roomId });
        if (room) {
          room.users = room.users.filter((user) => user !== userId);
          room.status = "active";
          if (room.users.length === 0) {
            await Room.deleteOne({ roomId: roomId });
          } else {
            await room.save();
          }
          io.to(roomId).emit("userLeft", userId);
        }

        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);
      }

      users = users.filter((user) => user.id !== socket.id);
    });

    // Handle WebRTC signaling
    socket.on("signal", (data) => {
      console.log("Forwarding signal from:", data.userId, "to room:", data.roomId);
      socket.to(data.roomId).emit("signalData", {
        userId: data.userId,
        signal: data.signal
      });
    });

    socket.on("sendMessage", (roomId, userId, message) => {
      console.log("Sending message:", message, "to room:", roomId, "from user:", userId);
      socket.to(roomId).emit("receiveMessage", message);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});