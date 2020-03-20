import express from "express";
import feed from "feed";
import { FeedOptions } from "feed/lib/typings/index";
import fetch from "node-fetch";
import os from "os";
import pino from "pino";
import expressPino from "express-pino-logger";

const Feed = feed.Feed;
const startDate = `2020-03-18+00%3A00%3A00`;
const elogAPIURI = `https://www-bd.fnal.gov/Elog/api/`;

const logger = pino({
  level: process.env.LOG_LEVEL || `info`
});
const expressLogger = expressPino({ logger });
const PORT = process.env.PORT || 7780;
const app = express();

app.use(expressLogger);

type log = {
  name: string;
};

type category = {
  name: string;
};

const getLogs = async () => {
  return await fetch(`https://www-bd.fnal.gov/Elog/api/get/logs/all`)
    .then(response => response.json())
    .then(logs => logs.map((log: log) => log.name));
};

const getEntries = async (log: string) => {
  const searchUrl = `${elogAPIURI}search/entries?orLogName=${log}&startDate=${startDate}`;
  logger.info(`Fetching ELog entries for ${log}`);
  return await fetch(searchUrl).then(response => response.json());
};

const createFeed = (log: string) => {
  return new Feed({
    title: `AD ELog: ${log}`,
    description: `ELog entries tagged in the ${log} log.`,
    id: `https://www-bd.fnal.gov/Elog`,
    link: `https://www-bd.fnal.gov/feeds/elog-${log}.rss`,
    image: `https://www-bd.fnal.gov/Elog/graphics/FnalLogo.png`,
    favicon: `https://www-bd.fnal.gov/favicon.ico`,
    generator: os.hostname(),
    feedLinks: {
      json: `https://www-bd.fnal.gov/Elog/api/search/entries?orLogName=${log}&sortingField=Modified+Date&startDate=2020-03-18+00%3A00%3A00`,
      atom: `https://www-bd.fnal.gov/feeds/elog-${log}.atom`,
      rss: `https://www-bd.fnal.gov/feeds/elog-${log}.rss`
    },
    author: {
      name: `Beau Harrison`,
      email: `beau@fnal.gov`
    }
  } as FeedOptions);
};

const printCategories = (categories: category[]) => {
  return categories.length > 0
    ? ` - ${categories.map(category => category.name).join(`, `)}`
    : ``;
};

const populateFeed = async (log: string) => {
  const entries = await getEntries(log);
  const feed = createFeed(log);

  for (let entry of entries) {
    const content = `${entry.creationDate} ${entry.author.firstName} ${entry.author.lastName} (${entry.author.name})
${entry.text}`;
    feed.addItem({
      title: `${log}${printCategories(entry.categories)}: `,
      id: `https://www-bd.fnal.gov/Elog/?orEntryId=${entry.id}`,
      link: `https://www-bd.fnal.gov/Elog/?orEntryId=${entry.id}`,
      description: entry.text,
      content,
      author: [
        {
          name: `${entry.author.firstName} ${entry.author.lastName}`,
          email: entry.author.emailAddress
        }
      ],
      date: new Date(entry.modifiedDate)
    });
  }

  return feed;
};

app.get(`/feeds/:log.:feedType`, (req, res) => {
  const log = req.params.log;
  const feedType = req.params.feedType;

  getLogs().then(logs => {
    if (logs.includes(log)) {
      populateFeed(log).then(feed => {
        if (feedType === `rss`) {
          logger.info(`Generating rss feed for ${log}`);
          res.type(`application/rss+xml`);
          res.send(feed.rss2());
        } else if (feedType === `atom`) {
          logger.info(`Generating atom feed for ${log}`);
          res.type(`application/atom+xml`);
          res.send(feed.atom1());
        }
      });
    } else {
      logger.warn(`Log ${log} doesn't exist`);
      res.status(500);
      res.send(`log name doesn't exist`);
      return;
    }
  });
});

app.listen(PORT, () => {
  logger.info(`elog-to-feed server started on port ${PORT}`);
});
