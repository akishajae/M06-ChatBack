/**
 * Servidor backend con Express, WebSocket y persistencia en archivos.
 * Proporciona funcionalidad de chat en tiempo real y edición de documentos colaborativa.
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Rutas de los archivos para persistencia
const CHAT_FILE = "./db/chat.txt";
const DOCUMENT_FILE = "./db/document.txt";

// Variables en memoria
let chatHistory = [];
let documentContent = "";

/**
 * Carga el historial de chat y contenido del documento desde archivos de texto.
 */
const loadData = async () => {
  try {
    const chatData = await fs.readFile(CHAT_FILE, "utf8");
    chatHistory = chatData
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/\[(.+?)\] (.+?): (.+)/);
        if (match) {
          return {
            author: match[2],
            text: match[3],
            timestamp: match[1],
          };
        }
        return null;
      })
      .filter((msg) => msg !== null);
  } catch (error) {
    console.error("Error loading chat history, initializing as empty:", error);
    chatHistory = [];
    await fs.writeFile(CHAT_FILE, "");
  }

  try {
    const docData = await fs.readFile(DOCUMENT_FILE, "utf8");
    documentContent = docData;
  } catch (error) {
    console.error("Error loading document, initializing as empty:", error);
    documentContent = "";
    await fs.writeFile(DOCUMENT_FILE, "");
  }
};

/**
 * Guarda el historial del chat en un archivo de texto.
 */
const saveChatHistory = async () => {
  try {
    const chatText = chatHistory
      .map((msg) => `[${msg.timestamp}] ${msg.author}: ${msg.text}`)
      .join("\n");
    await fs.writeFile(CHAT_FILE, chatText);
    console.log("Chat history saved successfully");
  } catch (error) {
    console.error("Error saving chat history:", error);
    throw error;
  }
};

/**
 * Guarda el contenido actual del documento en un archivo de texto.
 */
const saveDocumentContent = async () => {
  try {
    await fs.writeFile(DOCUMENT_FILE, documentContent);
    console.log("Document content saved successfully");
  } catch (error) {
    console.error("Error saving document content:", error);
    throw error;
  }
};

// Inicializa el servidor una vez que se han cargado los datos
loadData().then(() => {
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  /**
   * Manejo de conexiones WebSocket
   */
  wss.on("connection", (ws) => {
    console.log("Cliente conectado");

    // Enviar mensajes iniciales al nuevo cliente
    ws.send(JSON.stringify({ type: "system", message: "Welcome to WebSocket server!" }));
    ws.send(JSON.stringify({ type: "document", content: documentContent }));
    ws.send(JSON.stringify({ type: "chatHistory", history: chatHistory }));

    /**
     * Maneja mensajes entrantes del cliente WebSocket
     */
    ws.on("message", async (data) => {
      try {
        const messageData = JSON.parse(data.toString());
        console.log("Received message:", messageData);

        if (messageData.type === "message") {
          if (!messageData.text || !messageData.author) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid message format",
              })
            );
            return;
          }

          const newMessage = {
            author: messageData.author,
            text: messageData.text,
            timestamp: messageData.timestamp,
          };

          chatHistory.push(newMessage);
          try {
            await saveChatHistory();
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Failed to save chat history",
              })
            );
            return;
          }

          // Reenvía el mensaje a todos los clientes conectados
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "broadcast", ...newMessage }));
            }
          });
        } else if (messageData.type === "document") {
          documentContent = messageData.content || "";
          try {
            await saveDocumentContent();
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Failed to save document content",
              })
            );
            return;
          }

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({ type: "document", content: documentContent })
              );
            }
          });
        } else if (messageData.type == "systemNotification") { //New user conected 
          const newMessage = {
            author: "system",
            text: messageData.text,
            timestamp: messageData.timestamp,
          };

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "broadcast", ...newMessage }));
            }
          });
        
        } else {
          ws.send(
            JSON.stringify({ type: "error", message: "Unknown message type" })
          );
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        ws.send(
          JSON.stringify({ type: "error", message: "Error processing message" })
        );
      }
    });

    ws.on("close", () => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "broadcast", message: "A user has disconnected." }));
        }
      });
      console.log("Cliente desconectado");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Endpoints HTTP

  /**
   * @route GET /api/chat
   * @desc Devuelve el historial del chat en texto plano
   */
  app.get("/api/chat", (req, res) => {
    const chatText = chatHistory.map((msg) => {
      const formattedTimestamp = new Date(msg.timestamp).toLocaleString("en-GB"); 
      return `[${formattedTimestamp}] ${msg.author}: ${msg.text}`;
    }).join("\n");
    res.setHeader("Content-Type", "text/plain");
    res.send(chatText);
  });

  /**
   * @route GET /api/document
   * @desc Devuelve el contenido actual del documento
   */
  app.get("/api/document", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(documentContent);
  });

  /**
   * @route GET /
   * @desc Endpoint de prueba
   */
  app.get("/", (req, res) => {
    res.send("Hello from the backend!");
  });

  /**
   * @route POST /api/message
   * @desc Recibe un mensaje nuevo y lo difunde a todos los clientes
   * @body { message: string, author: string }
   */
  app.post("/api/message", async (req, res) => {
    const { message, author } = req.body;
    if (!message || !author) {
      return res.status(400).json({ error: "Mensaje o autor vacío" });
    }

    const newMessage = {
      author,
      text: message,
      timestamp: new Date().toISOString(),
    };

    chatHistory.push(newMessage);
    try {
      await saveChatHistory();
    } catch (error) {
      return res.status(500).json({ error: "Failed to save chat history" });
    }

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "broadcast", ...newMessage }));
      }
    });

    res.json({ sent: true });
  });

  /**
   * @route POST /login
   * @desc Autenticación de usuario simple
   * @body { username: string, email: string }
   */
  app.post("/login", async (req, res) => {
    const { username, email } = req.body;

    try {
      const usersFile = "./db/users.json";
      const usersData = await fs.readFile(usersFile, "utf8");
      const users = JSON.parse(usersData);

      const user = users.find(
        (user) => user.name === username && user.email === email
      );

      if (user) {
        return res.status(200).json({ message: "Usuario encontrado", user });
      }
      return res.status(404).json({ error: "Usuario no encontrado" });
    } catch (error) {
      console.error("Error reading users:", error);
      return res.status(500).json({ error: "Error del servidor" });
    }
  });

  server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
  });
});
