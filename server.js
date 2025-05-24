const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files like customer.html from 'public'
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 5000;
const AIML_API_URL = "https://api.aimlapi.com/v1/chat/completions";
const AIML_API_KEY = process.env.AIML_API_KEY;

const users = new Map();
const messages = []; // store messages in memory

// Socket.io events
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("join", (username) => {
    users.set(socket.id, username);
    io.emit("update_users", Array.from(users.values()));

    // Send chat history stored in memory
    socket.emit("chat_history", messages);
  });

  socket.on("send_message", (data) => {
    const sender = users.get(socket.id) || data.sender;
    const msg = { sender, text: data.text, time: new Date().toLocaleTimeString() };

    // Save message to in-memory array
    messages.push(msg);

    io.emit("receive_message", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
    users.delete(socket.id);
    io.emit("update_users", Array.from(users.values()));
  });
});

// AI Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    

    const response = await axios.post(
      AIML_API_URL,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${AIML_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;

    let suggestion = "";
    if (message.toLowerCase().includes("refund")) {
      suggestion = "How long does a refund take?";
    } else if (message.toLowerCase().includes("account")) {
      suggestion = "How do I reset my account password?";
    } else {
      suggestion = "Can you give me more details?";
    }

    res.json({ reply, suggestion });
  } catch (error) {
    console.error("AI API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "AI API error" });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
