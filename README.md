# electrdp
The electrdp is a rdp client implemented with electron. It is based on mtsc.js which is a pure javascript Microsoft RDP (Remote Desktop Client) client using nodejs, node-rdpjs and socket.io.  
electrdp support only 64bit platform(windows, linux, mac).

## Install
Install last release:
`npm install --global-style`
or
`npm install`

## client.patch
It is patch for mstsc.js to support other than the default 3389.
The patch target is below.
`src/node_modules/mstsc.js/client/js/client.js`

## Run
enter electrdp project's directory tree and run below code
`npm start`

## Build
for linux:
`npm run pack:linux`

for windows:
`npm run pack:win32`

for mac:
`npm run pack:mac`
*building is must on osx.*

## Distribution
distribution is in dist directory.
