import express from "express";
import feed from "feed";
import { FeedOptions } from "feed/lib/typings/index";
import fetch from "node-fetch";
import os from "os";
import pino from "pino";
import expressPino from "express-pino-logger";

const Feed = feed.Feed;
const feedURI = `https://www-bd.fnal.gov/feeds/`;
const elogURI = `https://www-bd.fnal.gov/Elog/`;
const elogAPIURI = `${elogURI}api/`;
const startDate = `2020-03-18+00%3A00%3A00`;

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
  return await fetch(`${elogAPIURI}get/logs/all`)
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
    id: elogURI,
    link: `${feedURI}${log}.rss`,
    image: `${elogURI}graphics/FnalLogo.png`,
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
    const formattedTitle = `${entry.creationDate} ${entry.author.firstName} ${entry.author.lastName} (${entry.author.name})`;
    const formattedEntry = `${entry.text}${
      entry.categories.length > 0
        ? `
        Categories: ${printCategories(entry.categories)}`
        : ``
    }`;

    feed.addItem({
      title: formattedTitle,
      id: `${elogURI}?orEntryId=${entry.id}`,
      link: `${elogURI}?orEntryId=${entry.id}`,
      description: formattedEntry,
      content: formattedEntry,
      author: [
        {
          name: `${entry.author.firstName} ${entry.author.lastName}`,
          email: entry.author.emailAddress,
          link: `${elogURI}?orUserName=${entry.author.name}`
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
        feed.options.feedLinks.atom = `${feedURI}${log}.${feedType}`;
        logger.info(`Generating ${feedType} feed for ${log}`);

        if (feedType === `rss`) {
          res.type(`application/rss+xml`);
          res.send(feed.rss2());
        } else if (feedType === `atom`) {
          res.type(`application/atom+xml`);
          res.send(feed.atom1());
        } else if (feedType === `json`) {
          res.type(`application/json`);
          res.send(feed.json1());
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
