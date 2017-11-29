const https = require('https');
const url = require('url');
const querystring = require('querystring');

const async = require('async');
var FeedParser = require('feedparser');

const WebhookEndpoints = {
  'spidey@totesnotrobots': {
    path: '---',
  },
};

const Personalities = {
  'botpersonality': {
    name: 'BotName',
    colour: 16765995,
    avatar: '.jpg',
    thumbnail: '.jpg',
    subscribers: 'spidey@totesnotrobots',
  },
}

const UpdateChannels = [
  {
    name: 'Channel',
    description: 'Channel Description',
    personality: 'parahumans',
    feedUrl: 'https://feed.com/feed',
    transformer: (article, personality) => {
      return {
        title: article.title,
        description: article.link,
        date: article.date,
        color: personality.colour,
        footer: {
          text: 'SpideyBot v0.1 alpha',
        },
      }
    }
  }
];

exports.handler = (event, context, callback) => {
  const lastRun = new Date(parseInt(process.env.LAST_RUN_AT));

  const feeds = UpdateChannels.map(channel => {
    return {
      channel: channel,
      request: https.request(channel.feedUrl),
      readableFeed: new FeedParser(),
      articles: [],
      payload: {
        embeds: [],
      },
    };
  });

  async.waterfall([
      function(waterfall_callback) {
        let calls = [];
        for(const feed of feeds) {
          calls.push(parallel_callback => {
            feed.request.on('response', (res) => {
              res.setEncoding('utf8');
              res.pipe(feed.readableFeed);
            });
            feed.readableFeed.on('readable', () => {
              let article;
              while(article = feed.readableFeed.read()) {
                if(article.date > lastRun) {
                  feed.articles.push(article);
                }
              }
            });
            feed.readableFeed.on('finish', () => {
              parallel_callback();
            });
            feed.request.end();
          });
        }
        async.parallel(calls, (err) => {
          waterfall_callback();
        });
      },
      function(waterfall_callback) {
        for(const feed of feeds) {
          for(const article of feed.articles) {
            let title = article.categories[0] + ' - ' + article.title;
            feed.payload.embeds.push(feed.channel.transformer(article, Personalities[feed.channel.personality]));
          }
        }
          waterfall_callback(null);
      },
      function(waterfall_callback) {
        const feed = feeds[0];
        const payload = JSON.stringify(feed.payload);
        const options = {
          hostname: 'discordapp.com',
          path: WebhookEndpoints['spidey@totesnotrobots'].path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        };
        const req = https.request(options);
        req.on('finish', (e) => {
          waterfall_callback(null, 'done');
        });
        req.on('error', (e) => {
          console.log(`Error: (request) ${e.message}`);
        });
        req.end(payload);
      }
  ]);

};

exports.handler(null, null, (error, message) => { console.log(error); console.log(message); process.exit(); });
