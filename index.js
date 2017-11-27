const querystring = require('querystring');
const https = require('https');

const postData = JSON.stringify({
    'content': '***CENSORED***',
});

const postRichData = JSON.stringify({
    'embeds': [{
        title: 'Plz Forgive',
        // type: 'rich', // always rich
        description: 'TOTALLY not a description',
        url: 'https://google.com.au',
        // timestamp: '', //ISO8601 timestamp
        color: 16777215, //Integer
        /*
        footer
        image
        thumbnail
        -video
        -provider
        author
        */
        fields: [
            {
                name: 'wow such link',
                value: '[masked link to who knows where](http://google.com)',
                inline: false,
            },
            {
                name: 'second field',
                value: '*usual* **__Markdown__**',
                inline: false,
            },
        ],
    }],
});

const options = {
    hostname: 'discordapp.com',
    path: '---',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
    },
};

exports.handler = (event, context, callback) => {

    const req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
        callback(null, 'End: error');
    });

    // write data to request body
    req.write(postData);
    req.end();
    callback(null, 'End: Finished');
};
