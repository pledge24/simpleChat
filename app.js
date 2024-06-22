const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 나는야 서버 인스턴스야!
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"], // WebSocket Handshake
    allowedHeaders: ["Authorization"], // JWT
  },
});

app.use(express.json());

// 정적 파일 제공 (클라이언트 HTML 파일)
app.use(express.static('public2'));

const socketMap = new Map(); // { nickname - socket }

// 뭐 하는지는 모르는 미들웨어지만 일단 다 잘되면 next 부르는 것은 국룰!
io.use((socket, next) => {
  // 여기서 내(클라이언트)가 전달해주는 닉네임으로 세팅!
  socket.data.username = socket.handshake.auth.nickname;
  next();
});

// 채팅 만든다고 했어요!
// 전체 채팅
// 룸 채팅
// DM은 사람답게!
// 룸은 한명이 여러개의 룸에 동시에 있을 수 있어요!

io.on("connection", (socket) => {
  socketMap.set(socket.data.username, socket);
  console.log(
    `새로운 키보드워리어 ${socket.data.username}님께서 입장을 하셨습니다!`
  );

  socket.on("all_chat", (msg) => {
    io.emit("all_chat", { username: socket.data.username, msg });
  });

  // 내가 지금 현재 어느 룸에 들어가있는지 알려주렴!
  socket.on("rooms", () => {
    const rooms = Array.from(socket.rooms);
    socket.emit("rooms", rooms);
  });

  socket.on("join", (room) => {
    socket.join(room);
    io.to(room).emit(
      "system",
      `채널 ${room}에 키보드워리어 ${socket.data.username}님께서 입장을 하셨습니다!`
    );
  });

  socket.on("leave", (room) => {
    socket.leave(room);
    io.to(room).emit(
      "system",
      `채널 ${room}에서 키보드워리어 ${socket.data.username}님께서 퇴장을 하셨습니다!`
    );
  });

  // 어느 룸에서 채팅을 칠것인가! 공지방? 잡담방? 기타 등등...
  socket.on("room_chat", ({ room, msg }) => {
    io.to(room).emit("room_chat", {
      room,
      username: socket.data.username,
      msg,
    });
  });

  socket.on("dm", ({ to, msg }) => {
    const target = socketMap.get(to); // socket 인출!
    if (!target) {
      socket.emit("dm", {
        username: "SERVER",
        msg: "잘못된 상대방 닉네임입니다!",
      });
    } else {
      socket.to(target.id).emit("dm", {
        username: socket.data.username,
        msg,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(
      `키보드워리어 ${socket.data.username}님께서 접속 종료를 하셨습니다!`
    );
    socketMap.delete(socket.data.username);
  });
});

server.listen(3000, () => {
  console.log(`헬게이트 오픈!`);
});