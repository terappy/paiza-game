'use strict'

/** socket.ioでサーバーに接続 */
// eslint-disable-next-line no-undef
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
        context.fillText(player.nickname, player.x, player.y + player.height + 30)
        context.font = '10px Bold Arial'
        context.textAlign = 'right'
        context.fillText('⚫️'.repeat(3), player.x + player.width + 50, player.y + player.height - 10)
        context.fillText('🔵'.repeat(3 - Object.keys(player.bullets).length), player.x + player.width + 50, player.y + player.height - 10)
        context.textAlign = 'left'
        context.fillStyle = 'gray'
        context.fillText('🖤'.repeat(player.maxHealth), player.x, player.y + player.height + 10)
        context.fillStyle = 'red'
        context.fillText('❤️'.repeat(player.health), player.x, player.y + player.height + 10)
        context.translate(player.x + player.width / 2, player.y + player.height / 2)
        context.rotate(player.angle + (90 * Math.PI / 180))
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
        context.fillStyle = 'gray'
        context.fillRect(wall.x, wall.y, wall.width, wall.height)
    })
})

socket.on('dead', (player) => {
    $('#message').text('Game Over L(ﾟ□ﾟ)」ｵｰﾏｲｶﾞ!')
    $('#start-screen').show()
})

let newsTimeoutID = null
socket.on('message', (message) => {
    clearTimeout(newsTimeoutID)
    $('#news').text(message)
    newsTimeoutID = setTimeout(() => {
        $('#news').text('')
    }, 8000)
})

socket.on('count', (count) => {
    $('#count').text(count)
})

// スマホ設定
/** touchの開始場所保存用 */
const touches = {}

/** タッチ開始した時の処理 */
$('#canvas-2d').on('touchstart', (event) => {
    socket.emit('shoot')
    movement.forward = true
    socket.emit('movement', movement)

    Array.from(event.changedTouches).forEach((touch) => {
        touches[touch.identifier] = { pageX: touch.pageX, pageY: touch.pageY }
    })
    event.preventDefault()
})

/** タッチ移動処理 */
$('#canvas-2d').on('touchmove', (event) => {
    movement.right = false
    movement.left = false
    Array.from(event.touches).forEach((touch) => {
        const startTouch = touches[touch.identifier]
        movement.right |= touch.pageX - startTouch.pageX > 20
        movement.left |= touch.pageX - startTouch.pageX < -20
    })
    socket.emit('movement', movement)
    event.preventDefault()
})

/** タッチ終了時の処理 */
$('#canvas-2d').on('touchend', (event) => {
    Array.from(event.changedTouches).forEach((touch) => {
        delete touches[touch.identifier]
    })
    if (Object.keys(touches).length === 0) {
        movement = {}
        socket.emit('movement', movement)
    }
    event.preventDefault()
})
