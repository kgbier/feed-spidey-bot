const https = require('https');
const url = require('url');
const querystring = require('querystring');

const AWS = require('aws-sdk');

const UpdateChannels = require('./config/updateChannels');
const Feed = require('./classes/Feed');

exports.handler = (event, context, callback) => {

  const feeds = UpdateChannels.map(channel => {
    return new Feed(channel.name,
                    channel.description,
                    channel.personality,
                    channel.feedUrl,
                    channel.transformer);
  });

  for(const feed of feeds) {
    feed.execute();
  }

  const now = Date.now().toString();
  const lambda = new AWS.Lambda();
  const params = {
    FunctionName: context.invokedFunctionArn,
    Environment: {
      Variables: {
        'LAST_RUN_AT': now,
      }
    },
  };
  lambda.updateFunctionConfiguration(params, (err, data) => {
    if (err) console.log(err, err.stack);
    else console.log('New Timestamp', now);
  });
};

