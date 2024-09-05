/*
    Tutorial:
    sendMessage() : sirve para enviar un mensaje, dentro de los parentesis va el mensaje (tiene que ir con comillas y si quieres poner comillas dentro del mensaje tienen que ir asi (\\\")) ejemplo: sendMessage("Hola!")
    getOnline() : Ve las personas que esten online, no poner nada dentro de los parentesis.
*/


const Names = document.querySelector('[class="sh-navbar__user-thumb"]').alt.split(" ")
let OriginalTitle = document.title

let wss

function connect() {
    if (!wss) {
        console.clear()
        wss = new WebSocket("wss://dzzzcord.onrender.com/")

        wss.onclose = () => {
            wss = undefined
            console.log("WebSocket closed.")
            connect()
        }
        wss.onopen = () => {
            wss.send(JSON.stringify({ "op": 1, "Username": Names[2].toLowerCase() }))
        };

        wss.onmessage = (event) => {
            let Message = JSON.parse(event.data)
            if (Message.op == 1) {
                setInterval(() => {
                    wss.send('{"op": 0}')
                }, Message.heartbeat)

                console.group('%cConectado al canal principal', "color:lime; font-size: 20px");
                console.log(`Tu nombre: ${Message.Username}`);
                console.log(`En el canal: ${Message.inMainChannel} + 1 (Tú!)`);
                console.groupEnd();

            } else if (Message.op == 2) {
                d = new Date()
                if (document.hidden) document.title = "(!)" + OriginalTitle
                console.log(`[${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}] ${Message.Username}: ${Message.Message}`)
            } else if (Message.op == 3) {
                console.log(Message.list)
            } else if (Message.op == -1) {
                console.log("Reconnecting...")
                connect()
            };
        };
    } else {
        wss.close()
        wss = undefined
        connect()
    }
}

function sendMessage(Message) {
    wss.send(JSON.stringify({ "op": 2, "Message": Message }))
}

function getOnline() {
    wss.send('{"op": 3}')
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        document.title = OriginalTitle
    }
});

connect()
/*
    Tutorial:
    sendMessage() : sirve para enviar un mensaje, dentro de los parentesis va el mensaje (tiene que ir con comillas) ejemplo: sendMessage("Hola!")
    getOnline() : Ve las personas que esten online, no poner nada dentro de los parentesis.
*/
