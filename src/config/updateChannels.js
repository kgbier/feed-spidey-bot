module.exports = [
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
          text: 'SpideyBot v0.1 alpha',
        },
      };
    },
  }
];
