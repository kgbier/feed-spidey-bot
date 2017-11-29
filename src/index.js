// console.log(process.hrtime());
const https = require('https');
const url = require('url');
const querystring = require('querystring');

const async = require('async');
var FeedParser = require('feedparser');

const WebhookEndpoints = {
  'spidey#totesnotrobots': {
    path: '/api/webhooks/ID/TOKEN'
  },
  'bot2#bot2': {
    path: '/api/webhooks/ID/TOKEN'
  }
};

const Personalities = {
  'botpersonality': {
    name: 'BotName',
    colour: 16765995,
    avatar: '.jpg',
    thumbnail: '.jpg',
    subscribers: 'spidey#totesnotrobots',
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
        timestamp: article.date,
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
        let calls = [];
        for(const feed of feeds) {
          calls.push(parallel_callback => {
            const payload = JSON.stringify(feed.payload);
            const options = {
              hostname: 'discordapp.com',
              path: WebhookEndpoints[Personalities[feed.channel.personality].subscribers].path,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              },
            };
            const request = https.request(options, (res) => {
              parallel_callback()
            });
            request.on('error', (e) => {
              console.log(e);
            });
            // request.end();
            request.end(payload);
            // console.log(payload);
          });
        }
        async.parallel(calls, (err) => {
          waterfall_callback();
        });
      }
  ], function(error) {
    console.log('end');
    // console.log(process.hrtime());
  });

};

exports.handler(null, null, (error, message) => { console.log(error); console.log(message); process.exit(); });
