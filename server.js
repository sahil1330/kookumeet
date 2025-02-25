import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

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

    socket.on("findPartner", ({ gender }) => {
      const partner = users.find((user) => user.gender !== gender && user.id !== socket.id);
      if (partner) {
        io.to(partner.id).emit("partnerFound", socket.id);
        io.to(socket.id).emit("partnerFound", partner.id);
        users = users.filter((user) => user.id !== partner.id && user.id !== socket.id);
      } else {
        users.push({ id: socket.id, gender });
      }
    });

    socket.on("sendSignal", (payload) => {
      io.to(payload.userToSignal).emit("receiveSignal", payload);
    });

    socket.on("returnSignal", (payload) => {
      io.to(payload.callerId).emit("receiveReturnSignal", payload);
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