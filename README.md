# Chatty Backend
Este proyecto es un servidor backend que utiliza **Express**, **WebSocket** y **persistencia en archivos**. Ofrece funcionalidades como **chat en tiempo real** y **edición colaborativa de documentos**.

El servidor está diseñado para interactuar con los clientes a través de WebSockets, lo que permite una comunicación bidireccional en tiempo real. Además, todos los datos, como el historial del chat y el contenido del documento, se guardan de manera persistente en archivos de texto.

---

## Requisitos

- Node.js (versión 14 o superior)
- npm (Node Package Manager)

---

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/akishajae/M06-ChatBack.git

2. Navega a la carpeta del proyecto:
   ```bash
   cd M06-ChatBack

3. Instala las dependencias:
   ```bash
   npm install

---

## Archivos de Persistencia

El servidor utiliza dos archivos para almacenar información:

- ./db/chat.txt: Guarda el historial del chat.

- ./db/document.txt: Guarda el contenido actual del documento colaborativo.

Estos archivos se leen y escriben automáticamente cada vez que se inicia el servidor o se actualizan los datos.

---

## Iniciar el Servidor
Para iniciar el servidor, ejecuta el siguiente comando:

```bash
npm start
```
El servidor escuchará en el puerto 4000.

---

## Características
- **Chat en tiempo real:** Los mensajes de chat se difunden a todos los clientes conectados a través de WebSocket.
- **Edición colaborativa de documentos:** Los cambios en el documento se sincronizan en tiempo real entre todos los usuarios.
- **Persistencia en archivos:** El historial del chat y el contenido del documento se guardan en archivos locales (chat.txt y document.txt), asegurando la persistencia entre reinicios del servidor.
- **Autenticación simple:** Los usuarios pueden autenticarse con un nombre de usuario y correo electrónico a través de un endpoint de login.

