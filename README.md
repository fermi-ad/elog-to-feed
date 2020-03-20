# ELog to Feed

This web service using the AD ELog API to generate feeds in the rss or atom formats.

## Install

Clone to a local directory and from the installed directory run:
```javascript
npm install
```

## Run

```javascript
npm start
```

## Client requests

Valid rss request example:
```bash
curl vclx3.fnal.gov:3333/feeds/Controls.rss
```

Valid atom request example:
```bash
curl vclx3.fnal.gov:3333/feeds/Safety.atom
```
