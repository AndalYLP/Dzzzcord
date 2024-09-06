const { json } = require("express");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const HEARTBEAT_INTERVAL = 47500
const TIMEOUT_INTERVAL = HEARTBEAT_INTERVAL + 30000

let Usernames = new Set()
let MainChannel = new Set([])

wss.on('connection', (ws) => {
    console.log('New client connected');
    let heartbeatTimer
    let timeoutTimer
    let Username
    let wsChannel

    heartbeatTimer = setInterval(() => HeartbeatHandle(ws), HEARTBEAT_INTERVAL);
    timeoutTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('Cerrando conexión por inactividad')
            ws.close()
            MainChannel.delete(Username)
            Usernames.delete(Username)
        }
    }, TIMEOUT_INTERVAL);

    ws.on("close", () => {
        console.log('Cliente desconectado');
        Usernames.delete(Username);
        MainChannel.delete(Username);
        clearInterval(heartbeatTimer);
        clearTimeout(timeoutTimer);
        wss.clients.forEach((client) => {
            if (client != ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ "op": -2, "Username": Username, "Leaving": true }));
            }
        });
    })

    ws.onerror = (error) => {
        console.error('Error en la conexión WebSocket:', error);
    };

    ws.on('message', (message) => {
        if (isJSON(message)) {
            message = JSON.parse(message)
            if (message.op == 1) {
                if (!Username) {
                    if ("Username" in message) {
                        u = message.Username
                        let e = 0

                        Usernames.forEach(function (v) { if (v && v.substring(0, u.length) == u) e = 1 + e })
                        Username = u + ((e != 0) ? e : "")
                        Usernames.add(Username)

                        MainChannel.add(Username)
                        wsChannel = MainChannel
                        ws.send(JSON.stringify({ "op": 1, "heartbeat": HEARTBEAT_INTERVAL, "Username": Username, "inMainChannel": MainChannel.size, "Messages": wsChannel.values().next().value }))

                        wss.clients.forEach((client) => {
                            if (client != ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ "op": -2, "Username": Username, "Leaving": false }));
                            }
                        });
                    } else {
                        ws.send('{ "error": "Username index not found" }')
                    }
                } else {

                }
            } else if (message.op == 2) {
                if (Username) {
                    if ("Message" in message) {
                        d = new Date()
                        msg = JSON.stringify({ "op": 2, "Username": Username, "Message": message.Message, "Time": `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}` })
                        wsChannel.values().next().value.push(msg)
                        broadcast(msg)
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 0) {
                clearTimeout(timeoutTimer)
                ws.send('{"op": 0, "received": true}')
                timeoutTimer = setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        console.log('Cerrando conexión por inactividad')
                        ws.send('{"op": -1, "Desconectando..."}')
                        ws.close()
                        Usernames = Usernames.filter(item => item !== Username)
                    }
                }, TIMEOUT_INTERVAL);
            } else if (message.op == 3) {
                ws.send(JSON.stringify({ "op": 3, "list": Array.from(Usernames).join(", ") }))
            } else if (message.op == 4) {

            } else {
                ws.send('{ "error": "Invalid op code" }')
            }
        } else {
            ws.send('{ "error": "Invalid message (not a valid json)" }')
        };
    });
});

/*
const cors = require('cors');
const path = require("path");
const fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 4000
app.use(cors());

app.get('/', (req, res) => {
    res.send('https://dzzzcord.onrender.com/client.js')
})

app.get('/client.js', (req, res) => {
    const filePath = path.join(__dirname, 'client.js');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.status(500).send('Error al cargar el archivo');
        } else {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(data);
        }
    });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

*/
function HeartbeatHandle(ws) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send('{ "op": 0 }');
    }
}

function isJSON(message) {
    try {
        JSON.parse(message);
        return true;
    } catch (e) {
        return false;
    }
}

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}