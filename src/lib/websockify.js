// A WebSocket to TCP socket proxy
// Copyright 2012 Joel Martin
// Licensed under LGPL version 3 (see docs/LICENSE.LGPL-3)

// Known to work with node 0.8.9
// Requires node modules: ws, optimist and policyfile
//     npm install ws optimist policyfile

module.exports = function(options) {
    return new Websockify(options);
};

var argv = require('optimist').argv,
    net = require('net'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    policyfile = require('policyfile');

var Buffer = require('buffer').Buffer,
    WebSocketServer = require('ws').Server;

function Websockify(options) {
    var source_host, source_port;

    var self = this;
    // parse source and target arguments into parts
    try {
        var idx;
        idx = options.source.indexOf(":");
        if (idx >= 0) {
            source_host = options.source.slice(0, idx);
            source_port = parseInt(options.source.slice(idx+1), 10);
        } else {
            source_host = "";
            source_port = parseInt(options.source, 10);
        }

        idx = options.target.indexOf(":");
        if (idx < 0) {
            throw("target must be host:port");
        }
        self.target_host = options.target.slice(0, idx);
        self.target_port = parseInt(options.target.slice(idx+1), 10);

        if (isNaN(source_port) || isNaN(self.target_port)) {
            throw("illegal port");
        }
    } catch(e) {
        console.error("websockify.js [--web web_dir] [--cert cert.pem [--key key.pem]] [source_addr:]source_port target_addr:target_port");
        return null;
    }

    console.log("WebSocket settings: ");
    console.log("    - proxying from " + source_host + ":" + source_port +
    " to " + self.target_host + ":" + self.target_port);

    if (options.web) {
        console.log("    - Web server active. Serving: " + options.web);
    }

    if (options.cert) {
        options.key = options.key || options.cert;
        var cert = fs.readFileSync(options.cert),
            key = fs.readFileSync(options.key);
        console.log("    - Running in encrypted HTTPS (wss://) mode using: " + options.cert + ", " + options.key);
        self.webServer = https.createServer({cert: cert, key: key}, self.http_request);
    } else {
        console.log("    - Running in unencrypted HTTP (ws://) mode");
        self.webServer = http.createServer(self.http_request);
    }
    self.webServer.listen(source_port, function() {
        self.wsServer = new WebSocketServer({server: self.webServer,
            handleProtocols: self.selectProtocol});
        self.wsServer.on('connection', function(client) { self.new_client(self, client) });
    });

// Attach Flash policyfile answer service
    policyfile.createServer().listen(-1, self.webServer);


}

// Handle new WebSocket client
Websockify.prototype.new_client = function(self, client) {

    var clientAddr = client._socket.remoteAddress, log;
    console.log(client.upgradeReq.url);
    log = function (msg) {
        console.log(' ' + clientAddr + ': '+ msg);
    };
    log('WebSocket connection');
    log('Version ' + client.protocolVersion + ', subprotocol: ' + client.protocol);

    var target = net.createConnection(self.target_port,self.target_host, function() {
        log('connected to target');
    });
    target.on('data', function(data) {
        //log("sending message: " + data);
        try {
            if (client.protocol === 'base64') {
                client.send(new Buffer(data).toString('base64'));
            } else {
                client.send(data,{binary: true});
            }
        } catch(e) {
            log("Client closed, cleaning up target");
            target.end();
        }
    });
    target.on('end', function() {
        log('target disconnected');
        client.close();
    });
    target.on('error', function() {
        log('target connection error');
        target.end();
        client.close();
    });

    client.on('message', function(msg) {
        //log('got message: ' + msg);
        if (client.protocol === 'base64') {
            target.write(new Buffer(msg, 'base64'));
        } else {
            target.write(msg,'binary');
        }
    });
    client.on('close', function(code, reason) {
        log('WebSocket client disconnected: ' + code + ' [' + reason + ']');
        target.end();
    });
    client.on('error', function(a) {
        log('WebSocket client error: ' + a);
        target.end();
    });
};


// Send an HTTP error response
Websockify.prototype.http_error = function (response, code, msg) {
    response.writeHead(code, {"Content-Type": "text/plain"});
    response.write(msg + "\n");
    response.end();
    return;
};

// Process an HTTP static file request
Websockify.prototype.http_request = function (request, response) {
//    console.log("pathname: " + url.parse(req.url).pathname);
//    res.writeHead(200, {'Content-Type': 'text/plain'});
//    res.end('okay');

    var self = this;
    if (! argv.web) {
        return self.http_error(response, 403, "403 Permission Denied");
    }

    var uri = url.parse(request.url).pathname
        , filename = path.join(argv.web, uri);

    fs.exists(filename, function(exists) {
        if(!exists) {
            return self.http_error(response, 404, "404 Not Found");
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += '/index.html';
        }

        fs.readFile(filename, "binary", function(err, file) {
            if(err) {
                return self.http_error(response, 500, err);
            }

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
};

// Select 'binary' or 'base64' subprotocol, preferring 'binary'
Websockify.prototype.selectProtocol = function(protocols, callback) {
    if (protocols.indexOf('binary') >= 0) {
        callback(true, 'binary');
    } else if (protocols.indexOf('base64') >= 0) {
        callback(true, 'base64');
    } else {
        console.log("Client must support 'binary' or 'base64' protocol");
        callback(false);
    }
};