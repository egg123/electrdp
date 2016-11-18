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

