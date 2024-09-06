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
                    wss.send(JSON.stringify({ "op": 1, "Username": Names[2].toLowerCase() }))
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
                console.log(`Tu nombre: ${Username}`);
                console.log(`En el canal: ${Message.inMainChannel} + 1 (Tú!)`);
                console.log('Para ayuda usa el comando "Help()"')
                console.groupEnd();

                Message.Messages.forEach(v => {
                    v = JSON.parse(v)
                    console.log(`\x1b[90m[${v.Time}] ` + ((v.Username == Username) ? "\x1b[94m" : "\x1b[92m") + `${v.Username}\x1b[0m: ${v.Message}`)
                });
            } else if (Message.op == 2) {
                d = new Date()
                if (document.hidden) { NotReadMessages += 1; document.title = `(${NotReadMessages}) ${OriginalTitle}` }
                console.log(`\x1b[90m[${Message.Time}] ` + ((Message.Username == Username) ? "\x1b[94m" : "\x1b[92m") + `${Message.Username}\x1b[0m: ${Message.Message}`)
            } else if (Message.op == 3) {
                console.log(Message.list)
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

function getOnline() {
    wss.send('{"op": 3}')
}

function Help() {
    console.group('%cComandos', "color:blue; font-size: 20px");
    console.log(`\x1b[33msendMessage("Mensaje aqui") \x1b[0m te sirve para enviar un mensaje ejemplo: sendMessage("Hola!"), tiene que ir entre comillas, si quieres usar comillas usa \\"`);
    console.log(`\x1b[33mgetOnline()\x1b[0m te sirve para ver quienes estan conectados, no necesitas poner nada dentro de los parentesis`);
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