const https = require('https');
const url = require('url');
const querystring = require('querystring');

const AWS = require('aws-sdk');

const config = require('./config/config');
const UpdateChannels = require('./config/updateChannels');
const Feed = require('./classes/Feed');

exports.handler = (event, context, callback) => {
  AWS.config.update({region: config.AWS_SDK_REGION});
  global.DYNAMO_CLIENT = new AWS.DynamoDB.DocumentClient();

  const feeds = UpdateChannels.map(channel => {
    return new Feed(channel.name,
                    channel.description,
                    channel.personality,
                    channel.feedUrl,
                    channel.transformer,
                    channel.categoryFilter);
  });

  for(const feed of feeds) {
    feed.execute();
  }

};

