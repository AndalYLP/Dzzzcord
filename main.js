const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const HEARTBEAT_INTERVAL = 47500
const TIMEOUT_INTERVAL = HEARTBEAT_INTERVAL + 30000

let Channels = [new Map([["Name", "MainChannel"], ["Messages", []], ["Users", new Map()]])]
let Usernames = new Map()
let MainChannel = Channels[0]

wss.on('connection', (ws) => {
    console.log('New client connected');
    let heartbeatTimer
    let timeoutTimer
    let Username
    let UToken
    let wsChannel

    heartbeatTimer = setInterval(() => HeartbeatHandle(ws), HEARTBEAT_INTERVAL);
    timeoutTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('Cerrando conexión por inactividad')
            ws.close()
            wsChannel.get("Users").delete(Username)
            Usernames.delete(Username)
        }
    }, TIMEOUT_INTERVAL);

    ws.on("close", () => {
        console.log('Cliente desconectado');
        Usernames.delete(Username);
        wsChannel.get("Users").delete(Username);
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
                    if ("Username" in message && "Token" in message) {
                        u = message.Username
                        let e = 0
                        Usernames.forEach((i, v) => { if (v && v.substring(0, u.length) == u) e += 1 })
                        Username = u + ((e != 0) ? e : "")
                        UToken = message.Token
                        Usernames.set(Username, [message.Token, ws])
                        console.log(Username + " " + message.Token)

                        wsChannel = MainChannel
                        wsChannel.get("Users").set(Username, ws)
                        ws.send(JSON.stringify({ "op": 1, "heartbeat": HEARTBEAT_INTERVAL, "Username": Username, "inMainChannel": MainChannel.get("Users").size - 1, "Messages": wsChannel.get("Messages") }))

                        wss.clients.forEach((client) => {
                            if (client != ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ "op": -2, "Username": Username, "Leaving": false }));
                            }
                        });
                    } else {
                        ws.send('{ "error": "Username index not found" }')
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 2) {
                if (Username) {
                    if ("Message" in message) {
                        d = new Date()
                        msg = JSON.stringify({ "op": 2, "Username": Username, "Message": message.Message, "Time": `${new Date().toISOString()}` })
                        wsChannel.get("Messages").push(msg)
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
                        Usernames.delete(Username)
                    }
                }, TIMEOUT_INTERVAL);
            } else if (message.op == 3) {
                if (Username) {
                    ws.send(JSON.stringify({ "op": 3, "list": Array.from(Usernames.keys()).join(", ") }))
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 4) {
                if (Username) {
                    if ("Message" in message && "User" in message) {
                        if (Usernames.has(message.User)) {
                            msg = JSON.stringify({ "op": 4, "Username": Username, "Message": message.Message, "Time": `${new Date().toISOString()}` })
                            Usernames.get(message.User)[1].send(msg)
                            ws.send(msg)
                        } else {
                            ws.send('{ "error": "Message or user not found" }')
                        }
                    } else {
                        ws.send('{ "error": "Message or user not found" }')
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 5) {
                if (Username) {
                    if ("Users" in message && "Name" in message) {
                        let Tokens = new Map([[Username, UToken]])
                        n = message.Name
                        let e = 0
                        Channels.forEach(v => { if (v && v.get("Name").substring(0, n.length) == n) e += 1 })
                        Name = n + ((e != 0) ? e : "")

                        message.Users.forEach(v => {
                            if (Usernames.has(v)) {
                                UserInfo = Usernames.get(v)
                                Tokens.set(v, UserInfo[0])
                                UserInfo[1].send(JSON.stringify({ "op": 51, "Name": Name }))
                            } else {
                                ws.send(JSON.stringify({ "op": 52, "User": v }))
                            }
                        });
                        Channels.push(([["Name", Name], ["ValidTokens", Tokens], ["Owner", Username], ["Messages", []], ["Users", new Map()]]))
                        ws.send(JSON.stringify({ "op": 5, "Name": Name }))
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else if (message.op == 6) {
                if (Username) {
                    if ("Channel" in message) {
                        console.log(Channels.find(map => { if (map.get("Name") == message.Channel) return true; else return false }), Channels.find(map => { if (map.has("ValidTokens") && map.get("ValidTokens").has(Username)) return true; else return false }))
                        if (Channels.find(map => { if (map.get("Name") == message.Channel) return true; else return false }) && Channels.find(map => { if (map.has("ValidTokens") && map.get("ValidTokens").has(Username)) return true; else return false })) {
                            wsChannel.get("Users").remove(Username)
                            wsChannel = Channels.get(message.Channel)
                            wsChannel.get("Users").set(Username, ws)
                            ws.send(JSON.stringify({ "op": 6, "Channel": wsChannel.get("Name"), "Owner": ((wsChannel.has("Owner") ? wsChannel.get("Owner") : false)), "inChannel": wsChannel.get("Users").size - 1 }))
                        } else {
                            ws.send('{ "error": "You cant access this chanel or didnt find it." }')
                        }
                    }
                } else {
                    ws.send('{ "error": "send op 1 first" }')
                }
            } else {
                ws.send('{ "error": "Invalid op code" }')
            }
        } else {
            ws.send('{ "error": "Invalid message (not a valid json)" }')
        };
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