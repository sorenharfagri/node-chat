const express = require("express")
const app = express();
const expressWs = require('express-ws')(app)
const wsController = require('./controllers/ws-controller.js')

const pid = process.pid;
const PORT = 3000;

app.ws('/chat', wsController)

app.listen(PORT, () => console.log(`Worker started on port ${PORT}, pid ${pid}`))