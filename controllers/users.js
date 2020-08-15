//Данный модуль содержит в себе методы для добавления/удаления/проверки никнейма пользователя, так-же хранит их список
const users = [];

/*
* Добавление пользователя
* @username: Имя пользователя
* @ws: websocket клиента
*/
const addUser = (username, ws) => {
    //Добавление в список подключенных пользователей
    users.push({
        username: username,
        ws: ws
    });
}

/*
* Удаление пользователя из списка подключенных
* @ws: Websocket клиента
* @return Object - удалённый пользователь
*/
const removeUser = ws => {
    const index = users.findIndex(user => user.ws === ws);

    if (index !== -1) return users.splice(index, 1)[0];
}


/*
* Проверка на повторяющийся никенйм в комнате
* @username: string - никнейм клиента
* @return bool - True если пользователь с никнеймом найден
*/
const isUserNameTaken = username => {
    let taken = false

    username = username.trim().toLowerCase();
    const existingUser = users.find(user => user.username === username);
    if (existingUser)
        taken = true;

    return taken;
}

module.exports = {addUser, removeUser, isUserNameTaken, users};
