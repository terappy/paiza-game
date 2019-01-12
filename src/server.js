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
 * GameObjectクラス
 */
class GameObject {
    constructor(obj = {}) {
        this.id = Math.floor(Math.random() * 1000000000)
        this.width = obj.width
        this.height = obj.height
        this.x = obj.x
        this.y = obj.y
        /** オブジェクトの向き */
        this.angle = obj.angle
    }

    /***
     * 移動メソッド
     */
    move(distance) {
        const oldX = this.x
        const oldY = this.y

        this.x += distance * Math.cos(this.angle)
        this.y += distance * Math.sin(this.angle)

        // 衝突判定処理
        let collision = false
        // 画面外かどうか
        if (this.x < 0 || this.x + this.width >= FIELD_WIDTH || this.y < 0 || this.y + this.height >= FIELD_HEIGHT) {
            collision = true
        }
        // 壁と衝突したか
        if (this.intersectWalls()) {
            collision = true
        }
        // 衝突したらオブジェクトを動かさない
        if (collision) {
            this.x = oldX
            this.y = oldY
        }
        return !collision
    }

    /** オブジェクトとの衝突判定 */
    intersect(obj) {
        return (this.x <= obj.x + obj.width) &&
            (this.x + this.width >= obj.x) &&
            (this.y <= obj.y + obj.height) &&
            (this.y + this.height >= obj.y)
    }

    /** 壁の衝突判定 */
    intersectWalls() {
        return Object.values(walls).some((wall) => this.intersect(wall))
    }

    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            angle: this.angle
        }
    }
}

/**
 * Playerクラス
 */
class Player extends GameObject {
    constructor(obj = {}) {
        super(obj)
        this.socketId = obj.socketId
        this.nickname = obj.nickname
        this.width = 80
        this.height = 80
        /** プレイヤーの体力 */
        this.health = this.maxHealth = 10
        this.bullets = {}
        /** プレイヤーの得点 */
        this.point = 0
        this.movement = {}

        // プレイヤーの初期位置設定（壁の中なら再設定）
        do {
            this.x = Math.random() * (FIELD_WIDTH - this.width)
            this.y = Math.random() * (FIELD_HEIGHT - this.height)
            this.angle = Math.random() * 2 * Math.PI
        } while (this.intersectWalls())
    }

    shoot() {
        // ステージ上で存在できる弾の上限は3発
        if (Object.keys(this.bullets).length >= 3) {
            return
        }

        // 弾の生成、位置をプレイヤーの真ん中に設定
        const bullet = new Bullet({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            angle: this.angle,
            player: this
        })

        bullet.move(this.width / 2)
        this.bullets[bullet.id] = bullet
        bullets[bullet.id] = bullet
    }

    damage() {
        this.health--
        if (this.health === 0) {
            this.remove()
        }
    }

    remove() {
        delete players[this.id]
        io.to(this.socketId).emit('dead')
    }

    toJSON() {
        return Object.assign(super.toJSON(), { health: this.health, maxHealth: this.maxHealth, socketId: this.socketId, point: this.point, nickname: this.nickname })
    }
}

class Bullet extends GameObject {
    constructor(obj) {
        super(obj)
        this.width = 15
        this.height = 15
        this.player = obj.player
    }

    remove() {
        delete this.player.bullets[this.id]
        delete bullets[this.id]
    }
}

class BotPlayer extends Player {
    constructor(obj) {
        super(obj)
        this.timer = setInterval(() => {
            if (!this.move(4)) {
                this.angle = Math.random() * Math.PI * 2
            }
            if (Math.random() < 0.2) {
                this.shoot()
            }
        }, 1000 / 30)
    }

    remove() {
        super.remove()
        clearInterval(this.timer)
        setTimeout(() => {
            const bot = new BotPlayer({ nickname: this.nickname })
            players[bot.id] = bot
        }, 3000)
    }
}

class Wall extends GameObject {

}

/** 壁オブジェクト群を生成する */
function createWalls() {
    let newWalls = {}
    for (let i = 0; i < 3; i++) {
        const wall = new Wall({
            x: Math.random() * FIELD_WIDTH,
            y: Math.random() * FIELD_HEIGHT,
            width: 200,
            height: 50
        })
        newWalls[wall.id] = wall
    }
    return newWalls
}

/** プレイヤー一覧 */
let players = {}
/** 弾一覧 */
let bullets = {}
/** 壁一覧 */
let walls = createWalls()

// bot生成
const bot = new BotPlayer({ nickname: 'bot' })
players[bot.id] = bot

io.on('connection', (socket) => {
    console.log('client: ' + socket.id + ' connected')
    let player = null

    // ゲーム開始時の処理
    socket.on('game-start', (config) => {
        player = new Player({
            socketId: socket.id,
            nickname: config.nickname
        })
        players[player.id] = player
    })

    // プレイヤー移動処理
    socket.on('movement', (movement) => {
        if (!player || player.health === 0) { return }
        player.movement = movement
    })

    // 弾発射処理
    socket.on('shoot', () => {
        if (!player || player.health === 0) { return }
        player.shoot()
    })

    // 通信終了処理
    socket.on('disconnect', () => {
        console.log('client: ' + socket.id + ' disconnected')
        /** プレイヤーが全てlogoutしていれば壁を再生成する */
        if (Object.keys(io.sockets.sockets).length === 0) {
            walls = createWalls()
        }

        if (!player) { return }
        delete players[player.id]
        player = null
    })
})

setInterval(() => {
    // 各プレイヤーごとの処理
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

    // 弾ごとの処理
    Object.values(bullets).forEach((bullet) => {
        if (!bullet.move(10)) {
            bullet.remove()
            return
        }
        Object.values(players).forEach((player) => {
            if (bullet.intersect(player)) {
                if (player !== bullet.player) {
                    player.damage()
                    bullet.remove()
                    bullet.player.point += 1
                }
            }
        })
    })

    // クライアントにオブジェクトの状態を送信
    io.sockets.emit('state', players, bullets, walls)
}, 1000 / 30)

app.use('/static', express.static(path.join(__dirname, 'static')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/index.html'))
})

server.listen(process.env.PORT || 3001, () => {
    console.log('Teraza app start!')
})
