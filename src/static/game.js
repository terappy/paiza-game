'use strict'

/** socket.ioでサーバーに接続 */
const socket = io()
/** canvasオブジェクトをHTML要素から取得 */
const canvas = $('#canvas-2d')[0]
/** 描画コンテキスト */
const context = canvas.getContext('2d')
const playerImage = $('#player-image')[0]

/** ゲーム開始時の処理 */
function gameStart() {
    socket.emit('game-start', { nickname: $('#nickname').val() })
    $('#start-screen').hide()
}

$('#start-button').on('click', gameStart)

/** playerの動き保存用変数 */
let movement = {}

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
    if (event.key === ' ' && event.type === 'keydown') {
        socket.emit('shoot')
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
        context.save()
        context.font = '20px Bold Arial'
        context.fillText(player.nickname, player.x, player.y + player.height + 25)
        context.font = '10px Bold Arial'
        context.fillStyle = 'gray'
        context.fillText('🖤'.repeat(player.maxHealth), player.x, player.y + player.height + 10)
        context.fillStyle = 'red'
        context.fillText('❤️'.repeat(player.health), player.x, player.y + player.height + 10)
        context.translate(player.x + player.width / 2, player.y + player.height / 2)
        context.rotate(player.angle)
        context.drawImage(playerImage, 0, 0, playerImage.width, playerImage.height, -player.width / 2, -player.height / 2, player.width, player.height)
        context.restore()

        if (player.socketId === socket.id) {
            context.save()
            context.font = '30px Bold Arial'
            context.fillText('You', player.x, player.y - 20)
            context.fillText(player.point + ' point', 20, 40)
            context.restore()
        }
    })

    Object.values(bullets).forEach((bullet) => {
        context.beginPath()
        context.arc(bullet.x, bullet.y, bullet.width / 2, 0, 2 * Math.PI)
        context.stroke()
    })

    Object.values(walls).forEach((wall) => {
        context.fillStyle = 'black'
        context.fillRect(wall.x, wall.y, wall.width, wall.height)
    })
})

socket.on('dead', () => {
    $('#start-screen').show()
})
