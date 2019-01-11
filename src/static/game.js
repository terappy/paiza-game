'use strict'

/** socket.ioでサーバーに接続 */
const socket = io()
/** canvasオブジェクトをHTML要素から取得 */
const canvas = $('#canvas-2d')[0]
/** 描画コンテキストを取得 */
const context = canvas.getContext('2d')
const playerImage = $('#player-image')[0]

/** playerの動き保存用変数 */
let movement = {}

/** ゲーム開始時の処理 */
function gameStart() {
    socket.emit('game-start')
}

$(document).on('keydown keyup', (event) => {
    const KeyToCommand = {
        'ArrowUp': 'forward',
        'ArrowDown': 'back',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    }
    const command = KeyToCommand[event.key]
    if (command) {
        if (event.type === 'keydown') {
            movement[command] = true
        } else { /* keyup */
            movement[command] = false
        }
        socket.emit('movement', movement)
    }
})

/** playerの状態を受け取り画面に描写する */
socket.on('state', (players, bullets, walls) => {
    context.clearRect(0, 0, canvas.width, canvas.height)

    context.lineWidth = 10
    context.beginPath()
    context.rect(0, 0, canvas.width, canvas.height)
    context.stroke()

    Object.values(players).forEach((player) => {
        context.drawImage(playerImage, player.x, player.y)
        context.font = '30px Bold Arial'
        context.fillText('Player', player.x, player.y - 20)
    })
})

socket.on('connect', gameStart)
