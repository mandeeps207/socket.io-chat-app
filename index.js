const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = './data.json';

dotenv.config({ path: './config.env' });

const app = express();

// init socket server
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// app homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// session post page
const { v4: uuidv4 } = require('uuid');
app.post('/session', (req, res) => {
  let data = {
    username: req.body.username,
    userID: uuidv4()
  }
  res.send(data);
});

// Helper functions for file operations
const initializeDataFile = () => {
  if (!fs.existsSync(path)) {
    const initialData = { users: [], messages: [] };
    fs.writeFileSync(path, JSON.stringify(initialData, null, 2));
  }
}

const readDataFromFile = () => {
  if (!fs.existsSync(path)) {
    initializeDataFile();
  }
  const jsonData = fs.readFileSync(path, 'utf-8');
  try {
    return JSON.parse(jsonData);
  } catch (error) {
    // If parsing fails, reinitialize the file
    initializeDataFile();
    return { users: [], messages: [] };
  }
}

const writeDataToFile = (data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// socket.io middleware
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const userID = socket.handshake.auth.userID;
  if (!username) {
    return next(new Error('Invalid username'));
  }
  socket.username = username;
  socket.id = userID;
  next();
});

// socket events
let users = [];
io.on('connection', async socket => {
  console.log('A user connected:', socket.id);

  // socket methods
  const methods = {
    getToken: (sender, receiver) => {
      let key = [sender, receiver].sort().join("_");
      return key;
    },
    fetchMessages: (sender, receiver) => {
      const data = readDataFromFile();
      let token = methods.getToken(sender, receiver);
      const findToken = data.messages.find(msg => msg.userToken === token);
      if (findToken) {
        io.to(sender).emit('stored-messages', { messages: findToken.messages });
      } else {
        let newToken = {
          userToken: token,
          messages: []
        }
        data.messages.push(newToken);
        writeDataToFile(data);
        console.log('Token created!');
      }
    },
    saveMessages: ({ from, to, message, time }) => {
      const data = readDataFromFile();
      let token = methods.getToken(from, to);
      let findToken = data.messages.find(msg => msg.userToken === token);
      if (findToken) {
        findToken.messages.push({ from, message, time });
      } else {
        let newToken = {
          userToken: token,
          messages: [{ from, message, time }]
        }
        data.messages.push(newToken);
      }
      writeDataToFile(data);
      console.log('Message saved!');
    }
  }

  // get all users
  let userData = {
    username: socket.username,
    userID: socket.id
  }
  users.push(userData);
  io.emit('users', { users });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    users = users.filter(user => user.userID !== socket.id);
    io.emit('users', { users });
    io.emit('user-away', socket.id);
  });

  // get message from client
  socket.on('message-to-server', payload => {
    io.to(payload.to).emit('message-to-user', payload);
    methods.saveMessages(payload);
  });

  // fetch previous messages
  socket.on('fetch-messages', ({ receiver }) => {
    methods.fetchMessages(socket.id, receiver);
  });

});

server.listen(3000, () => {
  console.log(`Server is running on port 3000...`);
});
