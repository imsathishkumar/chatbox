const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  roomName: String,
  password: String
});

const Room = mongoose.model("Room", chatRoomSchema);

exports.Room = Room;
