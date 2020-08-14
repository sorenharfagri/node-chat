const WebSocket = require('ws');
const readline = require('readline');
const Writable = require('stream').Writable;
const chalk = require('chalk')
const prompts = require('prompts');

//Клиент чата

// Метод для отправки чего-либо в консоль
const console_out = msg => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
};

//Метод для исключения echo из stdout
let mutableStdout = new Writable({
    write: function (chunk, encoding, callback) {
        if (!this.muted)
            process.stdout.write(chunk, encoding);
        callback();
    }
});
mutableStdout.muted = true;

const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true
});

//Синхронный метод для логина из консоли
//С помощью prompts самостоятельно получает и отправляет никнейм на сервер
async function login() {

    const response = await prompts({
        type: 'text',
        name: 'value',
        message: 'Whats your nickname?',
        validate: value => !value.trim() ? `Enter nickname` : true
    });

    send({method: "username", params: {username: response.value.trim()}, id: 1})
    return response;
}

/*
* Метод сериализует полученные данные, добавляет заголовок jsonrpc, отправляет сообщение сервер
* @data: Данные для передачи
*/
const send = data => {
    const msg = JSON.stringify({
        jsonrpc: '2.0',
        ...data
    });

    ws.send(msg)
}

const ws = new WebSocket(`ws://localhost:3000/chat`);

//Обработка ошибок при подключении к серверу
ws.addEventListener("error", error => {
    if (error.target.readyState === 3) {
        this.connectionTries--;

        if (this.connectionTries > 0) {
            setTimeout(() => this.connect(`ws://localhost:3000/chat`), 5000);
        } else {
            console.log("Maximum number of connection trials has been reached, try again later..");
        }

    } else {
        console.log(`Server unavailable, try again later..`)
        process.exit(0);
    }
});

ws.onopen = () => {

    //Логиним пользователя
    //Метод отправляет никнейм на сервер
    //Сервер в свою очередь возвращает JSON-RPC, с ошибкой либо же статусом 'success'
    //Ошибка обрабатывается в сокетах
    login();

    ws.onmessage = (event) => {
        let data = JSON.parse(event.data);

        //Если в JSON-RPC пришла ошибка - обрабатываемп
        if (data.error) {
            console_out(`Error: ${chalk.yellow(data.error.message)}`);

            //В слуаче ошибки логина ошибка выводится в консоль методом выше
            //Пользователю будет предложен повторный логин
            if (data.id === 1 && data.error) {
                login();
            }

            //Если ошибок нет - смотрим что нам прислал сервер
        } else {

            //Получение сообщения
            if (data.method === 'update') {
                console_out(`${data.params.date} | ${chalk.green(data.params.username)}: ${data.params.message}`)
            }

            //Успешный логин
            if (data.id === 1 && data.result) {
                console_out(`${chalk.green('> Login completed \n')}`)

                let stdin = process.openStdin();

                //Если успешно залогинилсь - подключается лисенер, который получает и отправляет сообщение на сервер
                stdin.addListener("data", message => {
                    message = message.toString().trim()
                    if (message) {
                        send({method: 'message', params: {message}})
                    }
                });
            }
        }

    }

    ws.onerror = error => {
        console.error("WebSocket error observed:", error);
    }
}
