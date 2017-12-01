# Spidey Bot feed reader

##### Konrad Biernacki (kgbier@gmail.com)

Discord webhook bot that posts updates from rss/atom feeds.

Designed to be compiled and deployed into AWS Lambda.

## Usage

`$ yarn build` - Compiles with webpack into `./dist/bundle.js`

`$ yarn deploy` - Uploads to a specified lambda function using the `aws-cli` (uses `./deploy.sh`)

## Run

`$ node run.js` to run the es6 program

or

`$ node run.bundle.js` to run the minified/bundled program

## Overview

- config/webhookEndpoints.js

A named collection of webhook endpoints.

```javascript
{
  'spidey#totesnotrobots': {
    path: '/api/webhooks/ID/TOKEN',
  },
  ...
};
```

- config/personalities.js

A named collection of webhook Personalities. Comprises a Name, Colour, Avatar image, Thumbnail image, and a Subscriber webhook endpoint.

NB: Colour is expressed in Integer format

```javascript
{
  'personalityOne': {
    name: 'Personality Name',
    colour: 16765995,
    avatar: '.jpg',
    thumbnail: '.jpg',
    subscriber: 'spidey#totesnotrobots',
  },
  ...
}
```

- config/updateChannels.js

Contains a list of Channels.
A Channel comprises a feed URL, a transform to compose the Discord Embed object from an Article, and a Personality to post articles to.

Transform object is required to compliment to discord Embed object as seen [here](https://discordapp.com/developers/docs/resources/channel#embed-object)

```javascript
[
  {
    name: 'Channel',
    description: 'Channel Description',
    personality: 'personalityOne',
    feedUrl: 'https://www.feeds.com/feed/',
    transformer: (article, personality) => {
      return {
        title: article.title,
        description: article.link,
        timestamp: article.date,
        color: personality.colour,
        footer: {
          text: VERSION_TEXT,
        },
      };
    },
  },
  ...
]
```
