'use strict'

const express = require('express')
const app = express()

app.get('/', (req, res) => {
    res.send('Hello World!!')
})

app.listen(3001, () => {
    console.log('My app listening on port 3001!')
})
