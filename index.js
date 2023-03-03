const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();

const route = require('./route');
const { addUser, findUser, getRoomUsers, removeUser } = require('./users');

app.use(cors({ origin: '*' }));
app.use(route);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('join', ({ name, room }) => {
    socket.join(room);
    //console.log('join(room)', room);
    const { user, isExist } = addUser({ name, room });

    const userMessage = isExist
      ? `${user.name}, и снова здравствуйте`
      : `Здравствуйте, ${user.name}`;

    socket.emit('message', {
      data: {
        user: { name: 'ChatAdmin' },
        message: userMessage,
        date: new Date(),
        to: room,
      },
    });

    socket.broadcast.to(user.room).emit('message', {
      data: {
        user: { name: 'ChatAdmin' },
        message: `${user.name} присоеденился`,
        date: new Date(),
        to: user.room,
      },
    });

    io.to(user.room).emit('room', {
      data: { users: getRoomUsers(user.room) },
    });
  });

  socket.on('sendMessage', ({ message, params, date }) => {
    //const user = findUser(params);
    let user = params;
    let to = params.room;
    console.log('sendMessage', user, message, date, to);

    io.to(user.room).emit('message', { data: { user, message, date, to } });
    // if (user) {
    //io.to(user.room).emit('message', { data: { user, message, date, to } });
    //}
  });

  socket.on('leftRoom', ({ params }) => {
    const user = removeUser(params);

    if (user) {
      const { room, name } = user;

      io.to(room).emit('message', {
        data: {
          user: { name: 'ChatAdmin' },
          message: `${name} вышел`,
          date: new Date(),
          to: room,
        },
      });

      io.to(room).emit('room', {
        data: { users: getRoomUsers(room) },
      });
    }
  });

  io.on('disconnect', () => {
    console.log('Отключить');
  });
});

server.listen(5000, () => {
  console.log('Сервер работает');
});

