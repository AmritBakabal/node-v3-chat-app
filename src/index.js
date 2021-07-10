const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utilis/messages')
const { addUser, getUser, removeUser, getUsersInRoom } = require('./utilis/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000 
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket Connection')

    // socket.emit('countUpdated', count)

    // socket.on('increment', () => {
    //     count++
        // socket.emit('countUpdated', count)   //This emits the event to the single connection
        // io.emit('countUpdated', count)          //This emits the event to every connection

    // })
    

    socket.on('join', (options, callback) => {     //{username, room} replaced by options
        const { error, user } = addUser({ id:socket.id, ...options })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))

        io.to(user.room).emit('RoomData', {
            room: user.room, 
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()

        if(filter.isProfane(message)) {
            return callback('Profinity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message) )
        
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))

            io.to(user.room).emit('RoomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    //location:
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))

        callback()
    })
})

server.listen(port, () => {
    console.log(`Server is listen in port : ${port}!`)
})