[![License](https://img.shields.io/badge/license-GPLv3-blue.svg?style=flat)](http://opensource.org/licenses/GPL-3.0)
This is a fork of matrix-org-irc, which is a fork of node-irc.

Added access to raw buffer on events, accessible in `message.buffer`

*important!* remember to choose "binary" encoding when initializing the irc `Client` instance, otherwise the buffer bytes will get converted.
```
new Client('someServer','someNick', {
  ...
  encoding:'binary'
  ...
})
```
