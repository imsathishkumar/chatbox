const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {Room} = require("./model/chatRoom");
const mongoose = require("mongoose");
require("dotenv").config();

const { userJoin, getCurrentUser, userLeave } = require("./utils/users");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB..."));

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

app.use(express.urlencoded());

app.use("/createRoom", async(req, res) => {
  const { username, room, roompassword } = req.body;
  console.log(username, room, roompassword)
  if(!username || !room || !roompassword){
    return  res.redirect("/index.html");
  }
  try {
    let chatroom = await Room.findOne({roomName : room});
    if(chatroom) return res.redirect("/index.html");
    chatroom = new Room({
      roomName : room,
      password : roompassword
    })
    await chatroom.save();
    res.redirect(`/chat.html?&username=${username}&room=${room}&roompassword=${roompassword}`);
  } catch (error) {
    console.log(error.message)
     res.redirect("/index.html");
  }
})

app.use("/checkRoom", async(req, res) => {
  const { username, room, roompassword } = req.body;
  if(!username || !room || !roompassword){
    return  res.redirect("/index.html");
  }
  try { 
    let chatroom = await Room.find({roomName:room});
    console.log(chatroom);
    if (!chatroom) return res.redirect("/index.html");
    if(roompassword != chatroom[0].password) return res.redirect("/index.html");
    res.redirect(`/chat.html?&username=${username}&room=${room}&roompassword=${roompassword}`)
  } catch (error) {
    console.log(error.message);
    res.redirect("/index.html");
  }
})

app.use("/generate", (req,res)=>{
  const {room , roompassword } = req.body;
  let link = `${process.env.URL}/join.html?&room=${room}&roompassword=${roompassword}`;
  res.send(link.toString());
})

// Run when client connects
io.on("connection", (socket) => {

  socket.on("joinRoom", ({ username, room, roompassword }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage("", `Welcome to ${user.room} Chat Room!`));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage("", `${user.username} has joined the chat`)
      );

      //sending room name
      io.to(user.room).emit('roomUsers', {
        room: user.room,
      });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage("", `${user.username} has left the chat`)
      );
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
