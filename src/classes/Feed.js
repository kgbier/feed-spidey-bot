const http = require('http');
const https = require('https');

const crypto = require('crypto');

const FeedParser = require('feedparser');

const config = require('../config/config');
const Personalities = require('../config/personalities');
const WebhookEndpoints = require('../config/webhookEndpoints');

class Feed {

  constructor(name, description, personality, feedUrl, transformer, categoryFilters) {
    this.personality = Personalities[personality];
    this.webhook = WebhookEndpoints[this.personality.subscriber];
    this.name = name;
    this.description = description;
    this.feedUrl = feedUrl;
    this.transformer = transformer;
    this.categoryFilters = categoryFilters ? categoryFilters : null; // Optional parameter
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
        if(data.Item) {
          console.log('[DynamoDB] Get Feed lastBuildDate success:', this.name);
          this.storedLastBuildDate = data.Item.lastBuildDate;
          console.log('Comparing feed', '(' + this.feedUrlHash, this.name + ')' , 'build date', this.feedLastBuildDate, 'with stored build date', this.storedLastBuildDate);
          if(this.storedLastBuildDate === this.feedLastBuildDate) { // no new articles...
            this.streamStatus = 'destroyed';
            stream.destroy();
            console.log('Ending feed stream:', this.name);
            callback(null, []);
            return;
          }
        } else {
          console.log('[DynamoDB] Get Feed empty lastBuildDate success:', this.name);
        }
        stream.on('readable', (() => {
          let article;
          let isFilteredOut = true;
          while(article = stream.read()) {
            console.log('Comparing', this.name, ':', article.title, article.date.getTime(), 'against last run', this.storedLastBuildDate);
            if(article.date <= this.storedLastBuildDate) {
              while(stream.read()) ; // Empty the stream because we don't want to explicitly revisit any entries and we want to trigger the 'end' event.
              return;
            }
            if(this.categoryFilters) {
              console.log('Comparing', this.name, ':', article.title, article.categories, 'against category filters', this.categoryFilters);
              for(let i = 0; i < this.categoryFilters.length; i++) {
                const testCategory = this.categoryFilters[i];
                if(article.categories.includes(testCategory)) {
                  console.log('Filtered In', this.name, ':', article.title, testCategory);
                  isFilteredOut = false;
                  break;
                }
              }
              if(isFilteredOut) {
                console.log('Filtered Out', this.name, ':', article.title);
                continue; // Move onto (perhaps) another article in our buffer if available
              }
            }
            articles.push(article);
            console.log('Queued', this.name, ':', article.title);
          }
        }).bind(this));
      }).bind(this)).catch((e) => {
        console.log('[DynamoDB] Get Exception: [', e, ']:', this.name);
      });
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
      }).bind(this)).catch((e) => {
        console.log('[DynamoDB] Put Exception: [', e, ']:', this.name);
      });
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
