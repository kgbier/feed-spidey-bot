const http = require('http');
const https = require('https');

const crypto = require('crypto');

const FeedParser = require('feedparser');

const config = require('../config/config');
const Personalities = require('../config/personalities');
const WebhookEndpoints = require('../config/webhookEndpoints');

class Feed {

  constructor(name, description, personality, feedUrl, transformer) {
    this.personality = Personalities[personality];
    this.webhook = WebhookEndpoints[this.personality.subscriber];
    this.name = name;
    this.description = description;
    this.feedUrl = feedUrl;
    this.transformer = transformer;
    this.articles = [];

    this.feedUrlHash = null;
    this.feedLastBuildDate = 0;
    this.storedLastBuildDate = 0;
    this.streamStatus = null;
  }

  execute() {
    console.log('Fetching', this.name);
    this.fetchNewArticles((err, articles) => {
      if(err) { console.log('Fetch error, aborting feed', this.name, '[', err, ']'); return; }
      if(articles.length <= 0) { console.log('Finished', this.name, '(No new articles)'); return; }
      console.log('Fetched', this.name);
      const payload = {
        embeds: articles.map(this.generateDiscordEmbed.bind(this))
      };
      console.log('Posting', this.name);
      this.webhookPost(payload, (err) => {
        if(err) { console.log('Post error', this.name, '[', err, ']'); return; }
        console.log('Posted', this.name);
      });
    });
  }

  fetchNewArticles(callback) {
    const articles = [];
    const stream = new FeedParser();

    stream.on('meta', (() => {
      const hash = crypto.createHash('md4');
      hash.update(this.feedUrl);
      this.feedUrlHash = hash.digest('base64');
      this.feedLastBuildDate = stream.meta.date.getTime();
      const data = global.DYNAMO_CLIENT.get({
        TableName: config.DYNAMODB_TABLE_NAME,
        Key: {
          feed: this.feedUrlHash,
        }
      }).promise().then(((data) => {
        console.log('Get feed dynamo success:', this.name);
        if(data.Item) {
          this.storedLastBuildDate = data.Item.lastBuildDate;
          console.log('Comparing feed', '(' + this.feedUrlHash, this.name + ')' , 'build date', this.feedLastBuildDate, 'with stored build date', this.storedLastBuildDate);
          if(this.storedLastBuildDate === this.feedLastBuildDate) { // no new articles...
            this.streamStatus = 'destroyed';
            stream.destroy();
            console.log('Ending feed stream:', this.name);
            callback(null, []);
            return;
          }
        }
        stream.on('readable', (() => {
          let article;
          while(article = stream.read()) {
            console.log('Comparing', this.name, ':', article.title, article.date.getTime(), 'against last run', this.storedLastBuildDate);
            if(article.date > this.storedLastBuildDate) {
              articles.push(article);
              console.log('Queued', this.name, ':', article.title);
            }
          }
        }).bind(this));
      }).bind(this));
    }).bind(this));
    stream.on('end', () => {
      callback(null, articles);
    });
    stream.on('error', ((err) => {
      if(this.streamStatus === 'destroyed') { return; }
      console.log('Stream Error [', err, ']:', this.name);
    }).bind(this));

    const isHTTPS = this.feedUrl.startsWith('https');
    const request_module = isHTTPS ? https : http;

    const request = request_module.request(this.feedUrl);
    request.setTimeout(3000, (() => {
      request.abort();
      callback('Feed request timed out: ' + this.name);
    }).bind(this));
    request.on('response', (res) => {
      res.setEncoding('utf8');
      res.pipe(stream);
    });
    request.on('error', (err) => {
      callback('Request Error: ' + err);
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
      global.DYNAMO_CLIENT.put({ // Run if we have new data or no data
        TableName: config.DYNAMODB_TABLE_NAME,
        Item: {
          feed: this.feedUrlHash,
          lastBuildDate: this.feedLastBuildDate,
        }
      }).promise().then((() =>{
        console.log('Put feed info success:', this.name);
      }).bind(this));
      callback();
    });
    request.setTimeout(3000, (() => {
      request.abort();
      callback('Post to Discord timed out: ' + this.name);
    }).bind(this));
    request.on('error', (err) => {
      callback(err);
    });
    request.end(payload);
  }

}

module.exports = Feed;
