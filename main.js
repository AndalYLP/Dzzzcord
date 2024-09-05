const WebSocket = require("ws");
const express = require('express');
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/script.js', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'script.js');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.status(500).send('Error al cargar el archivo');
        } else {
            res.setHeader('Content-Type', 'application/javascript');
            res.send(data);
        }
    });
});

app.listen(process.env.PORT || 4000, () => {
    console.log(`Example app listening on port ${port}`)
})

const wss = new WebSocket.Server({ port: 8080 });

const HEARTBEAT_INTERVAL = 47500
const TIMEOUT_INTERVAL = HEARTBEAT_INTERVAL + 30000
console.log(TIMEOUT_INTERVAL)
let heartbeatTimer
let timeoutTimer

let Usernames = []
let MainChannel = []

wss.on('connection', (ws) => {
    console.log('New client connected');
    let Username
    let wsChannel

    heartbeatTimer = setInterval(() => HeartbeatHandle(ws), HEARTBEAT_INTERVAL);
    timeoutTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('Cerrando conexión por inactividad')
            ws.close()
            Usernames = Usernames.filter(item => item !== Username)
        }
    }, TIMEOUT_INTERVAL);

    ws.on("close", () => {
        Usernames = Usernames.filter(item => item !== Username)
        clearInterval(heartbeatTimer);
        clearTimeout(timeoutTimer);
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
                        Usernames.find(v => { if (v.substring(0, u.length) == u) e = 1 + e })
                        Username = u + ((e != 0) ? e : "")
                        Usernames.push(Username)

                        ws.send(JSON.stringify({ "op": 1, "heartbeat": HEARTBEAT_INTERVAL, "Username": Username, "inMainChannel": MainChannel.length }))
                        MainChannel.push(Username)
                        wsChannel = MainChannel
                    } else {
                        ws.send('{ "error": "Username index not found" }')
                    }
                } else {

                }
            } else if (message.op == 2) {
                if (Username) {
                    if ("Message" in message) {
                        broadcast(JSON.stringify({ "op": 2, "Username": Username, "Message": message.Message }))
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
                ws.send(JSON.stringify({ "op": 3, "list": JSON.stringify(Usernames) }))
            }
        } else {
            ws.send('{ "error": "Invalid message (not a valid json)" }')
        };
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

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