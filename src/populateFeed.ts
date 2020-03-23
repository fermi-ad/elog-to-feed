import feed from "feed";
import { FeedOptions } from "feed/lib/typings/index";
import fetch from "node-fetch";
import os from "os";

const Feed = feed.Feed;
const elogURI = `https://www-bd.fnal.gov/Elog/`;
const elogAPIURI = `${elogURI}api/`;
const startDate = `2020-03-18+00%3A00%3A00`;

type log = {
  name: string;
};

type category = {
  name: string;
};

type author = {
  firstName: string;
  lastName: string;
  name: string;
};

type entry = {
  text: string;
  creationDate: string;
  author: author;
};

type comment = entry;

const getLogs = async (): Promise<string[]> => {
  return await fetch(`${elogAPIURI}get/logs/all`)
    .then(response => response.json())
    .then(logs => logs.map((log: log) => log.name));
};

const getEntries = async (log: string): Promise<any> => {
  const searchUrl = `${elogAPIURI}search/entries?orLogName=${log}&startDate=${startDate}`;
  return await fetch(searchUrl).then(response => response.json());
};

const createFeed = (feedURI: string, log: string): feed.Feed => {
  return new Feed({
    title: `AD ELog: ${log}`,
    description: `ELog entries tagged in the ${log} log.`,
    id: elogURI,
    link: `${feedURI}${log}.rss`,
    image: `${elogURI}graphics/FnalLogo.png`,
    favicon: `https://www-bd.fnal.gov/favicon.ico`,
    generator: os.hostname(),
    feedLinks: { atom: `${feedURI}${log}.rss` },
    author: {
      name: `Beau Harrison`,
      email: `beau@fnal.gov`,
      link: `https://tele.fnal.gov/cgi-bin/telephone.script?type=id&string=15660N`
    }
  } as FeedOptions);
};

const printCategories = (categories: category[]): string => {
  return categories.length > 0
    ? categories.map(category => category.name).join(`, `)
    : ``;
};

const printTitle = (entry: entry | comment): string => {
  return `${entry.creationDate} ${entry.author.firstName} ${entry.author.lastName} (${entry.author.name})`;
};

const printComments = (comments: comment[]): string => {
  let commentResult = ``;

  for (let comment of comments) {
    commentResult += `\t${printTitle(comment)}\n`;
    commentResult += `\t${comment.text}`;
  }

  return commentResult;
};

const populateFeed = async (
  feedURI: string,
  log: string,
  beta: boolean = false
): Promise<feed.Feed> => {
  const entries = await getEntries(log);
  const feed = createFeed(feedURI, log);

  for (let entry of entries) {
    const formattedTitle = printTitle(entry);
    const formattedEntry = `\n${entry.text}${
      entry.comments.length > 0 ? `\n${printComments(entry.comments)}` : ``
    }${
      entry.categories.length > 0
        ? `\nCategories: ${printCategories(entry.categories)}`
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

export { getLogs, populateFeed };
