const moment = require('moment');
//Методы для работы с пользователями
const {addUser, removeUser, isUserNameTaken, users} = require('./users.js');

//Модуль отвечает за сокеты чата

//TODO Проверить, нужны ли return-ы

/*
* Отправка JSON-RPC сообщения клиенту
* Метод сериализует полученные данные, добавляем заголовок jsonrpc
* @ws: websocket пользователя
* @data: Данные для передачи
*/
const send = (ws, data) => {
    const msg = JSON.stringify({
        jsonrpc: '2.0',
        ...data
    });

    ws.send(msg)
}

module.exports = (ws, req) => {

    ws.on('message', msg => {
        let data;

        //Пробуем парсить json из сообщения
        //Если не выходит - отправляем ошибку с невалидным json-ом
        try {
            data = JSON.parse(msg)
            if (!data.id)
                data.id = null;
        } catch (e) {
            send(ws, {error: {message: 'Invalid json'}})
            return;
        }

        //Обрабатываем ошибки, связанные с заголовком jsonrpc
        //Так-же проверяем наличие метода
        if (!data.jsonrpc || data.jsonrpc !== "2.0") {
            console.log(`Found an error in jsonrpc`)
            send(ws, {error: {message: 'Server uses jsonrpc:"2.0", check "jsonrpc" param of request'}, id: data.id})
            return;
        } else if (!data.method || typeof data.method !== 'string') {
            console.log(`Found an error in method`)
            send(ws, {error: {message: `Invalid method, check "method" param of request`}, id: data.id})
            return;
        }

        //Если пользователь залогинен - ему будет доступен метод отправки сообщения
        //В ином случае - будет доступен метод логина
        if (ws.authentification) {

            switch (data.method) {
                case 'message': {

                    //Проверяем, имеются ли параметры, и сообщение в них
                    //Если нет - отправляем ошибку
                    if (!data.params || typeof data.params.message !== "string" || !data.params.message.toString().trim()) {
                        send(ws, {error: {message: `Invalid message`}, id: data.id})
                        break;
                    }

                    //Ищем никнейм отправителя сообщения
                    const username = users.find(user => user.ws === ws).username;
                    //Формирование дату отправления
                    const date = moment().format('LTS');

                    //Бродкастим сообщение пользователям
                    users.forEach(user => {
                        if (user.username !== username)
                            send(user.ws, {
                                method: 'update',
                                params: {
                                    message: data.params.message,
                                    username,
                                    date
                                }
                            })
                    })

                    //Easter egg
                    if (data.params.message === "foo") {
                        send(ws, {
                            method: 'update',
                            params: {
                                message: `bar`,
                                username: 'Admin',
                                date
                            }
                        })
                    }
                    break;
                }
                //Если метод не был найден - отправляем ошибку
                default: {
                    send(ws, {error: {message: `Method '${data.method}' not found`}, id: data.id});
                    break;
                }

            }

        } else {
            switch (data.method) {
                //Если пользователь не залогинен - ему доступен метод логина
                case 'username': {

                    //Проверяем параметры, наличие в них никнейма
                    if (!data.params || !data.params.username || typeof data.params.username !== "string") {
                        send(ws, {error: {message: `Username required, check params of request`}, id: data.id})
                        break;
                        //Проверяем, не занят ли никнейм
                    } else if (isUserNameTaken(data.params.username)) {
                        send(ws, {error: {message: 'Username is taken'}, id: data.id})
                        break;
                    } else {
                        //Если всё отлично - добавляем пользователя
                        addUser(data.params.username, ws);
                        //Отсылаем подтверждение логина
                        send(ws, {result: {status: 'success'}, id: data.id})
                        //Устанавлиаем статус, позволяющий использовать методы для залогиненных пользователей
                        ws.authentification = true;

                        //Приветствуем нового пользователя
                        const date = moment().format('LTS');
                        send(ws, {
                            method: 'update',
                            params: {
                                message: `${data.params.username}, welcome to the hideout! Users online: ${users.length}`,
                                username: 'Admin',
                                date
                            }
                        })

                        //Бродкастим оповещение о новом пользователе в чат
                        users.forEach(user => {
                            if (user.username !== data.params.username)
                                send(user.ws, {
                                    method: 'update',
                                    params: {
                                        message: `${data.params.username} connected`,
                                        username: 'Admin',
                                        date
                                    }
                                })
                        })
                    }
                    break;
                }
                //Метод на неайден - отправляем ошибку
                default: {
                    send(ws, {
                        error: {message: `Method '${data.method}' not found, or you have to login with 'username' method`},
                        id: data.id
                    });
                    break;
                }
            }
        }

    })

    ws.onclose = () => {
        //При отключении - удаляем пользователя
        let user = removeUser(ws);

        if (user) {
            //Оповещаем чат, о том что он потерял пользователя
            const date = moment().format('LTS');
            users.forEach(user => {
                send(user.ws, {
                    method: 'update',
                    params: {
                        message: `${user.username} disconnected`,
                        username: 'Admin',
                        date
                    }
                })
            })
        }
    };

    ws.onerror = error => {
        console.error("WebSocket error observed:", error);
    }

}
