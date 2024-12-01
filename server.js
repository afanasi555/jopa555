const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Путь к файлу пользователей
const usersFile = 'users.json';

// Главная страница (страница входа и регистрации)
app.get('/', (req, res) => {
  res.render('index');
});

// Страница регистрации
app.get('/register', (req, res) => {
  res.render('register');
});

// Страница комнаты
app.get('/room/:roomId', (req, res) => {
  res.render('room', { roomId: req.params.roomId });
});

// Обработка регистрации пользователя
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Чтение пользователей из файла
  fs.readFile(usersFile, (err, data) => {
    if (err) {
      return res.status(500).send('Ошибка при чтении файла');
    }

    const users = JSON.parse(data || '[]');
    // Проверка на существование пользователя
    if (users.find(user => user.username === username)) {
      return res.status(400).send('Пользователь с таким именем уже существует');
    }

    // Добавление нового пользователя
    users.push({ username, password });
    fs.writeFile(usersFile, JSON.stringify(users), (err) => {
      if (err) {
        return res.status(500).send('Ошибка при сохранении данных');
      }
      res.redirect('/');
    });
  });
});

// Запуск сервера
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Обработка WebSocket-соединений
io.on('connection', (socket) => {
  console.log('A user connected');

  // Событие для присоединения к комнате
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log(`${userId} joined room ${roomId}`);

    // Обработка событий видео
    socket.on('play-video', (roomId) => {
      socket.to(roomId).broadcast.emit('play-video');
    });

    socket.on('pause-video', (roomId) => {
      socket.to(roomId).broadcast.emit('pause-video');
    });

    socket.on('seek-video', (roomId, time) => {
      socket.to(roomId).broadcast.emit('seek-video', time);
    });

    // Чат
    socket.on('chat-message', (roomId, message) => {
      socket.to(roomId).broadcast.emit('chat-message', message);
    });

    // Добавление видео в очередь
    socket.on('add-to-queue', (roomId, videoUrl) => {
      socket.to(roomId).broadcast.emit('add-to-queue', videoUrl);
    });

    // Выход из комнаты
    socket.on('leave-room', (roomId, userId) => {
      socket.leave(roomId);
      console.log(`${userId} left room ${roomId}`);
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
});
