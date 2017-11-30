const https = require('https');

const FeedParser = require('feedparser');

const Personalities = require('../config/personalities');
const WebhookEndpoints = require('../config/webhookEndpoints');

class Feed {

  constructor(name, description, personality, feedUrl, transformer) {
    this.lastRun = new Date(parseInt(process.env.LAST_RUN_AT));
    this.personality = Personalities[personality];
    this.webhook = WebhookEndpoints[this.personality.subscriber];
    this.name = name;
    this.description = description;
    this.feedUrl = feedUrl;
    this.transformer = transformer;
    this.articles = [];
  }

  execute() {
    this.fetchNewArticles((err, articles) => {
      if(err) { console.error(err); return; }
      const payload = {
        embeds: articles.map(this.generateDiscordEmbed.bind(this))
      };
      this.webhookPost(payload, (err) => {
        if(err) { console.error(err); return; }
      });
    });
  }

  fetchNewArticles(callback) {
    const stream = new FeedParser();
    const request = https.request(this.feedUrl);
    const articles = [];

    stream.on('readable', () => {
      let article;
      while(article = stream.read()) {
        if(article.date > this.lastRun) {
          articles.push(article);
        }
      }
    });
    stream.on('finish', () => {
      callback(null, articles);
    });
    stream.on('error', (err) => {
      callback(err);
    });

    request.on('response', (res) => {
      res.setEncoding('utf8');
      res.pipe(stream);
    });
    request.on('error', (err) => {
      callback(err);
    });
    request.end();
  }

  generateDiscordEmbed(article) {
    return this.transformer(article, this.personality);
  }

  webhookPost(payload, callback) {
    payload = JSON.stringify(payload);
    const options = {
      hostname: 'discordapp.com',
      path: this.webhook.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const request = https.request(options, (res) => {
      callback();
    });
    request.on('error', (err) => {
      callback(err);
    });
    // request.end();
    request.end(payload);
  }

}

module.exports = Feed;