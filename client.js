const Names = document.querySelector('[class="sh-navbar__user-thumb"]').alt.split(" ")
let OriginalTitle = document.title
let NotReadMessages = 0
let wss

function connect() {
    console.clear()
    let Username
    if (!wss) {
        wss = new WebSocket("wss://dzzzcord.onrender.com/")

        wss.onclose = () => {
            wss = undefined
            console.log("WebSocket closed.")
            connect()
        }
        wss.onopen = () => {
            while (true) {
                if (wss.readyState === WebSocket.OPEN) {
                    wss.send(JSON.stringify({ "op": 1, "Username": Names[2].toLowerCase(), "Token": JSON.parse(localStorage.TOKEN_V4_CIMA).token }))
                    break
                }
            }
        };

        wss.onmessage = (event) => {
            let Message = JSON.parse(event.data)
            if (Message.op == 1) {
                setInterval(() => {
                    wss.send('{"op": 0}')
                }, Message.heartbeat)
                Username = Message.Username
                console.group('%cConectado al canal principal', "color:lime; font-size: 20px");
                console.log(`Tu nombre: \x1b[1m${Username}`);
                console.log(`En el canal: \x1b[1m${Message.inMainChannel} + 1 \x1b[90m(Tú!)`);
                console.log('Para ayuda usa el comando \x1b[33mHelp()')
                console.groupEnd();

                Message.Messages.forEach(v => {
                    v = JSON.parse(v)
                    console.log(`\x1b[90m[${new Date(v.Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ` + ((v.Username == Username) ? "\x1b[94m" : "\x1b[92m") + `${v.Username}\x1b[0m: ${v.Message}`)
                });
            } else if (Message.op == 2 || Message.op == 4) {
                d = new Date()
                if (document.hidden) { NotReadMessages += 1; document.title = `(${NotReadMessages}) ${OriginalTitle}` }
                console.log(`🔒 \x1b[90m[${new Date(Message.Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ` + ((Message.Username == Username) ? "\x1b[94m" : "\x1b[92m") + `${Message.Username}\x1b[0m: ${((Message.op == 4) ? "\x1b[44m" : "")}${Message.Message}`)
            } else if (Message.op == 3 || Message.op == 7) {
                console.log(Message.list)
            } else if (Message.op == 5) {
                console.log(`✅ \x1b[90mCanal \x1b[33m${Message.Name}\x1b[90m creado.`)
            } else if (Message.op == 51) {
                console.log(`➕ \x1b[90mTe añadieron al canal \x1b[33m${Message.Name}\x1b[90m!`)
            } else if (Message.op == 52) {
                console.log(`❗ \x1b[90mNo se encontro al usuario \x1b[33m${Message.User}\x1b[90m.`)
            } else if (Message.op == 6) {
                console.clear()
                console.group(`%cConectado al canal ${Message.Channel}`, "color:lime; font-size: 20px");
                console.log(`Tu nombre: \x1b[1m${Username}`);
                if (Message.Owner) console.log(`Creador: ${Message.Owner}`)
                console.log(`En el canal: \x1b[1m${Message.inChannel} + 1 \x1b[90m(Tú!)`);
                console.log('Para ayuda usa el comando \x1b[33mHelp()')
                console.groupEnd();
                Message.Messages.forEach(v => {
                    v = JSON.parse(v)
                    console.log(`\x1b[90m[${new Date(v.Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ` + ((v.Username == Username) ? "\x1b[94m" : "\x1b[92m") + `${v.Username}\x1b[0m: ${v.Message}`)
                });
            } else if (Message.op == -1) {
                console.log("Reconnecting...")
                connect()
            } else if (Message.op == -2) {
                console.log(`${((Message.Leaving) ? "⬅️" : "➡️")}\x1b[33m ${Message.Username}\x1b[90m ${((Message.Leaving) ? "se ha ido." : "se ha unido.")} `)
            };
        };
    } else {
        wss.close()
    }
}

function sendMessage(Message) {
    wss.send(JSON.stringify({ "op": 2, "Message": Message }))
}

function whisp(Message, User) {
    wss.send(JSON.stringify({ "op": 4, "Message": Message, "User": Username }))
}

function createChannel(Users = [], ChannelName) {
    wss.send(JSON.stringify({ "op": 5, "Users": Users, "Name": ChannelName }))
}

function gotoChannel(channelName) {
    wss.send(JSON.stringify({ "op": 6, "Channel": channelName }))
}

function getChannels() {
    wss.send('{"op":7}')
}

function getOnline() {
    wss.send('{"op": 3}')
}

function Help() {
    console.group('%cComandos', "color:blue; font-size: 20px");
    console.log(`\x1b[33msendMessage("Mensaje aqui") \x1b[0m Te sirve para enviar un mensaje ejemplo: sendMessage("Hola!"), tiene que ir entre comillas, si quieres usar comillas usa \\"`);
    console.log(`\x1b[33mwhisp("Mensaje aqui", "destinatario") \x1b[0m Te sirve para enviar un mensaje que solo una persona lo puede ver ejemplo: whisp("Hola Usuario1!", "Usuario1"), si quieres usar comillas usa \\"`);
    console.log(`\x1b[33mgotoChannel("Nombre del canal")\x1b[0m Ve a un canal en el que estes por ejemplo: gotoChannel("MainChannel")`);
    console.log(`\x1b[33mcreateChannel(["Usuario1","Usuario2"], "Nombre del canal")\x1b[0m Crea un canal ejemplo: createChannel(["Usuario1","Usuario2"], "Los npcs")`);
    console.log(`\x1b[33mgetChannels()\x1b[0m Ve todos los canales que tienes disponibles, no necesitas poner nada dentro de los parentesis`);
    console.log(`\x1b[33mgetOnline()\x1b[0m Te sirve para ver quienes estan conectados, no necesitas poner nada dentro de los parentesis`);
    console.log('Proximamente más comandos.')
    console.groupEnd();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        NotReadMessages = 0
        document.title = OriginalTitle
    }
});

connect()

