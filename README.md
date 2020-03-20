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
curl vclx3.fnal.gov:7780/feeds/Controls.rss
```

Valid atom request example:
```bash
curl vclx3.fnal.gov:7780/feeds/Safety.atom
```

## Service

A service can be created to ensure uptime and syslogs by using `elog-to-feed.service` as a template and copying it to `/etc/systemd/system/`.

To test that the service file works:
```bash
systemctl start elog-to-feed.service
```

You can see status and output using:
```bash
systemctl status elog-to-feed.service -l
```

To have it start on system start:
```bash
systemctl enable elog-to-feed.service
```