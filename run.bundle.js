const spideybot = require('./dist/bundle');

spideybot.handler(null, null, (error, message) => { console.log(error); console.log(message); process.exit(); });
