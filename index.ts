import express from "express";
import socket from "socket.io";
import cors from "cors";
import morgan from "morgan";

const app = express();

app.use(cors());
app.options("*", cors());
app.use(morgan("tiny"));

app.use(express.json());

const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

const io = socket(server);

let nextRoomId = 1;

type Room = { number: number; user_1?: string; user_2?: string };

const isAvailable = (room: Room): boolean =>
  room.user_2 === undefined && room.user_1 === undefined;

const rooms: Array<Room> = [];

app.post("/room", (req: express.Request, res: express.Response) => {
  const user = req.body.name;
  console.log("user", req.body);
  let room = rooms.find((room) => isAvailable(room));
  if (!room) {
    room = { number: nextRoomId, user_1: user, user_2: undefined };
    rooms.push(room);
    nextRoomId++;
    const roomNs = io.of("/" + room.number);
    roomNs.on("connection", (socket) => {
      console.log("new connection", socket.id);
      socket.on("ready", (data) => {
        socket.broadcast.emit("ready", data);
        console.log("ready", data);
      });
      socket.on("readyAcknowledged", (data) => {
        socket.broadcast.emit("readyAcknowledged", data);
        console.log("readyAcknowledged", data);
      });
      socket.on("guess", (data) => {
        socket.broadcast.emit("guess", data);
        console.log("guess", data);
      });
      socket.on("attemptResult", (data) => {
        socket.broadcast.emit("attemptResult", data);
        console.log("attemptResult", data);
      });
      socket.on("restartGame", (data) => {
        socket.broadcast.emit("restartGame", data);
        console.log("restartGame", data);
      });
    });
  } else {
    room.user_1 = user;
    room.user_2 = undefined;
  }
  console.log("rooms", rooms);
  res.json(room);
});

app.post("/room/:roomNumber", (req, res) => {
  const roomNumber = Number.parseInt(req.params.roomNumber);
  const user = req.body.name;
  if (Number.isNaN(roomNumber)) {
    res
      .status(400)
      .json("The given room number was not a number: " + req.params.roomNumber);
  } else {
    const room = rooms.find((room) => room.number === roomNumber);
    if (!room) {
      res
        .status(404)
        .json("The given room number does not exsit: " + req.params.roomNumber);
    } else {
      room.user_2 = user;
      res.status(200).json(room);
    }
  }
});
