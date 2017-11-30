const https = require('https');
const url = require('url');
const querystring = require('querystring');

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

};

