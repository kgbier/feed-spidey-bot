const spideybot = require('./src/index');

spideybot.handler(null, null, (error, message) => { console.log(error); console.log(message); process.exit(); });
