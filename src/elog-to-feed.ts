import express, { Request, Response } from "express";
import pino from "pino";
import expressPino from "express-pino-logger";
import { getLogs, populateFeed } from "./populateFeed.js";

const feedURI = `https://www-bd.fnal.gov/feeds/`;

const logger = pino({
  level: process.env.LOG_LEVEL || `info`
});
const expressLogger = expressPino({ logger });
const PORT = process.env.PORT || 7780;
const app = express();

app.use(expressLogger);

const requestHandler = (req: Request, res: Response) => {
  const { beta } = req.query;
  const { log, feedType } = req.params;

  getLogs().then(logs => {
    if (logs.includes(log)) {
      populateFeed(feedURI, log, beta).then(feed => {
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
};

app.get(`/feeds/:log.:feedType`, requestHandler);

app.listen(PORT, () => {
  logger.info(`elog-to-feed server started on port ${PORT}`);
});
