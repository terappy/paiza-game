'use strict'

const express = require('express')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')

const app = express()
const server = http.Server(app)
const io = socketIO(server)

// ゲーム画面のサイズ設定
const FIELD_WIDTH = 1000
const FIELD_HEIGHT = 1000

/***
 * Playerクラス
 */
class Player {
    constructor(obj = {}) {
        this.id = Math.floor(Math.random() * 1000000000)
        this.width = 80
        this.height = 80
        this.x = Math.random() * (FIELD_WIDTH - this.width)
        this.y = Math.random() * (FIELD_HEIGHT - this.height)
        /** playerの向き */
        this.angle = 0
        /** 移動方向 */
        this.movement = {}
    }

    /***
     * 移動メソッド
     */
    move(distance) {
        this.x += distance * Math.cos(this.angle)
        this.y += distance * Math.sin(this.angle)
    }
}

/** プレイヤー一覧 */
let players = {}

io.on('connection', (socket) => {
    let player = null

    // ゲーム開始時の処理
    socket.on('game-start', (config) => {
        player = new Player()
        players[player.id] = player
    })

    // プレイヤー移動処理
    socket.on('movement', (movement) => {
        if (!player) { return }
        player.movement = movement
    })

    // 通信終了処理
    socket.on('disconnect', () => {
        if (!player) { return }
        delete players[player.id]
        player = null
    })
})

setInterval(() => {
    Object.values(players).forEach((player) => {
        const movement = player.movement
        if (movement.forward) {
            player.move(5)
        }
        if (movement.back) {
            player.move(-5)
        }
        if (movement.left) {
            player.angle -= 0.1
        }
        if (movement.right) {
            player.angle += 0.1
        }
    })
    io.sockets.emit('state', players)
}, 1000 / 30)

app.use('/static', express.static(path.join(__dirname, '/static')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/index.html'))
})

server.listen(3001, () => {
    console.log('My app listening on port 3001!')
})
