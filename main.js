const WebSocket = require("ws");
const https = require('https');

const server = https.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`
    <html>
      <head>
        <title>Hostia chavales</title>
      </head>
      <body style="margin: 0; padding: 0;">
      </body>
    </html>`);
});
const wss = new WebSocket.Server({ port: 8080 });

const HEARTBEAT_INTERVAL = 47500
const TIMEOUT_INTERVAL = HEARTBEAT_INTERVAL + 10000
let heartbeatTimer
let timeoutTimer

const Usernames = []

wss.on('connection', (ws) => {
    console.log('New client connected');
    let Username

    heartbeatTimer = setInterval(() => HeartbeatHandle(ws), HEARTBEAT_INTERVAL);
    timeoutTimer = setTimeout(() => TimeoutHandle(ws, Username), TIMEOUT_INTERVAL);

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

                        ws.send(`{ "op": 1 , "heartbeat": ${HEARTBEAT_INTERVAL}, "Username": "${Username}" }`)
                    } else {
                        ws.send('{ "error": "Username index not found" }')
                    }
                } else {

                }
            } else if (message.op == 2) {
                if (Username) {
                    if ("Message" in message) {
                        broadcast(`{ "op": 2, "Username": "${Username}", "Message" : "${message.Message}"}`)
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 0) {
                clearTimeout(timeoutTimer)
                timeoutTimer = setTimeout(() => TimeoutHandle(ws, Username), TIMEOUT_INTERVAL);
            } else if (message.op == 3) {
                ws.send(`{ "op": 3, "list": ${Usernames} }`)
            }
        } else {
            ws.send('{ "error": "Invalid op" }')
        };
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

server.listen(8081, () => {
    console.log('Servidor HTTPS escuchando en el puerto 8081');
});

function HeartbeatHandle(ws) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send('{ "op": 0 }');
    }
}

function TimeoutHandle(ws, Username) {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('Cerrando conexión por inactividad')
        ws.close()
        Usernames.filter(item => item !== Username)
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