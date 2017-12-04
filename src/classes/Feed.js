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
    console.log('Fetching', this.name);
    this.fetchNewArticles((err, articles) => {
      if(articles.length <= 0) { console.log('Finished', this.name, '(No new articles)'); return; }
      if(err) { console.error(err); return; }
      console.log('Fetched', this.name);
      const payload = {
        embeds: articles.map(this.generateDiscordEmbed.bind(this))
      };
      console.log('Posting', this.name);
      this.webhookPost(payload, (err) => {
        if(err) { console.error(err); return; }
        console.log('Posted', this.name);
      });
    });
  }

  fetchNewArticles(callback) {
    const articles = [];
    const stream = new FeedParser();
    const request = https.request(this.feedUrl);
    request.setTimeout(3000, (() => {
      callback('Request timed out: ' + this.name);
    }).bind(this));

    stream.on('readable', () => {
      let article;
      while(article = stream.read()) {
        if(article.date > this.lastRun) {
          articles.push(article);
          console.log('Queued', this.name, ':', article.title);
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
    request.setTimeout(3000, (() => {
      callback('Post to Discord timed out: ' + this.name);
    }).bind(this));
    request.on('error', (err) => {
      callback(err);
    });
    // request.end();
    request.end(payload);
  }

}

module.exports = Feed;
