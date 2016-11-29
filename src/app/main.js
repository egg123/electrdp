"use strict";

const mstsc = require('mstsc.js');

const {app, Tray, BrowserWindow} = require('electron');

let mainWindow = null;

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', (event, hasVisibleWindows) => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('ready', () => {
	createWindow();
});


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 960,
        frame: true,
        title: 'electrdp',
        webPreferences: {
			nodeIntegration: false,
        }
    });

    mainWindow.loadURL('http://localhost:9250/');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.on('page-title-updated', (event, title) => {
    	event.preventDefault();
    });
}

/**
 * experimental code for websockify
 */
var websockify = require("../lib/websockify");

// listening on port 15900, connecting to VNC server running on localhost. But localhost:5900 is NG, must be <ipaddress>:<port>. Maybe a bug in websockify.
var proxy = websockify({source: ":15900", target: "127.0.0.1:5900"});