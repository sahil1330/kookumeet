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

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    connectToDB();
    socket.on("createRoom", async (roomId, userId) => {
      console.log("Creating room:", roomId);
      const existingRoom = await Room.findOne({ users: userId });
      if (existingRoom) {
        io.to(socket.id).emit("roomCreated", existingRoom.roomId);
      } else {
        const room = new Room({
          roomId: roomId,
          users: [userId],
          status: "active",
        });
        await room.save();
        io.to(socket.id).emit("roomCreated", roomId);
      }
    });

    socket.on("findRooms", async (userId) => {
      console.log("Finding room for user:", userId);
      console.log("Socket ID:", socket.id);
      const room = await Room.find({ status: "active" });
      console.log("Found rooms:", room, "for user:", userId);
      if (room.length === 0) {
        io.to(socket.id).emit("noRoomsFound");
      } else {
        io.to(socket.id).emit("roomsFound", room.map(r => r.roomId));
      }
    });

    socket.on("joinRoom", async (roomId, userId) => {
      console.log("Joining room:", roomId);
      const userInRoom = await Room.findOne({ users: userId });
      if (userInRoom) {
        io.to(socket.id).emit("userJoined", userInRoom.roomId);
      } else {
        socket.join(roomId);
        console.log("Joined room:", roomId);
        const room = await Room.findOne({ roomId: roomId });
        if (room.users.length !== 2) {
          room.users.push(userId);
          room.status = "full";
          await room.save();
          io.to(roomId).emit("userJoined", userId);
        } else {
          io.to(roomId).emit("roomFull", roomId);
        }
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
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      users = users.filter((user) => user.id !== socket.id);
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