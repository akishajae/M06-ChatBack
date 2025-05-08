const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const { json } = require("stream/consumers");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket solo para emitir mensajes
wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  // Send a welcome message
  ws.send('Welcome to WebSocket server!');

  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
  ws.on("message", (data) => {
    console.log("Mensaje recibido del cliente:", data.toString());

    // Puedes reenviar a todos los clientes si quieres:
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`[Broadcast] ${data}`);
      }
    });
  });
});


// Endpoint para enviar mensaje a todos los WebSocket conectados
app.post("/api/message", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Mensaje vacío" });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.json({ sent: true });
});

// Endpoint: GET /
app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});


app.post("/login", (req, res) => {
  const { username, email } = req.body;
  const users = require("../db/users.json");
  
  // return res.status(200).json({"user":username, "email": email, "userlist":users})
 users.forEach((user) => {
    if (user.name == username && user.email == email) {
      return res.status(200).json({ message: "Usuario encontrado" });
    }
  });
  return res.status(404).json({ error: "Usuario no encontrado" });



});
