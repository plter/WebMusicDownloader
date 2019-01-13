const fs = require("fs");
const net = require("net");
const http = require("http");
const https = require("https");
const Constants = require("../../commons/Constants");
const url = require("url");
const path = require("path");
const electron = require("electron");
const proxy = require("./proxy");

module.exports = class ProxyAdapter {

    constructor() {
    }

    start(successCallback, errorCallback, httpsProxySuccessCallback, httpsProxyErrorCallback) {
        this.startHttpsProxyServer(() => {
            if (httpsProxySuccessCallback) {
                httpsProxySuccessCallback();
            }

            this.startProxyAdapter(successCallback, errorCallback);
        }, httpsProxyErrorCallback);
    }

    startProxyAdapter(successCallback, errorCallback) {
        let httpProxyServer = proxy.setup(http.createServer());
        httpProxyServer.on("request", req => {
            if (this.onConnectURL) {
                this.onConnectURL(req.url, req);
            }
        });
        httpProxyServer.on('error', errorCallback);
        httpProxyServer.listen(Constants.MONITOR_PROXY_ADAPTER_PORT, successCallback);
    }


    startHttpsProxyServer(successCallback, errorCallback) {
        let appDir = electron.remote.app.getAppPath();

        let httpsProxyServer = https.createServer({
            key: fs.readFileSync(path.join(appDir, 'src', 'res', 'server.key')),
            cert: fs.readFileSync(path.join(appDir, 'src', 'res', 'server.crt'))
        });
        httpsProxyServer.on("request", (req, res) => {

            var server = httpsProxyServer;
            var socket = req.socket;

            let hostname = req.headers.host;
            var options = {port: 443, hostname: hostname, path: req.url, method: req.method, protocol: "https:"};

            if (this.onConnectURL) {
                this.onConnectURL(`https://${options.hostname}${options.path}`, req);
            }

            // setup outbound proxy request HTTP headers
            var headers = {};
            var hasXForwardedFor = false;
            var hasVia = false;
            var via = '1.1 ' + hostname + ' (proxy/0.0.0)';

            options.headers = headers;
            proxy.eachHeader(req, function (key, value) {
                console.log('Request Header: "%s: %s"', key, value);
                var keyLower = key.toLowerCase();

                if (!hasXForwardedFor && 'x-forwarded-for' === keyLower) {
                    // append to existing "X-Forwarded-For" header
                    // http://en.wikipedia.org/wiki/X-Forwarded-For
                    hasXForwardedFor = true;
                    value += ', ' + socket.remoteAddress;
                    console.log('appending to existing "%s" header: "%s"', key, value);
                }

                if (!hasVia && 'via' === keyLower) {
                    // append to existing "Via" header
                    hasVia = true;
                    value += ', ' + via;
                    console.log('appending to existing "%s" header: "%s"', key, value);
                }

                if (proxy.isHopByHop.test(key)) {
                    console.log('ignoring hop-by-hop header "%s"', key);
                } else {
                    var v = headers[key];
                    if (Array.isArray(v)) {
                        v.push(value);
                    } else if (null != v) {
                        headers[key] = [v, value];
                    } else {
                        headers[key] = value;
                    }
                }
            });

            // add "X-Forwarded-For" header if it's still not here by now
            // http://en.wikipedia.org/wiki/X-Forwarded-For
            if (!hasXForwardedFor) {
                headers['X-Forwarded-For'] = socket.remoteAddress;
                console.log('adding new "X-Forwarded-For" header: "%s"', headers['X-Forwarded-For']);
            }

            // add "Via" header if still not set by now
            if (!hasVia) {
                headers.Via = via;
                console.log('adding new "Via" header: "%s"', headers.Via);
            }

            // custom `http.Agent` support, set `server.agent`
            var agent = server.agent;
            if (null != agent) {
                console.log('setting custom `http.Agent` option for proxy request: %s', agent);
                options.agent = agent;
                agent = null;
            }

            if ('https:' != options.protocol) {
                res.writeHead(400);
                res.end('Only "https:" protocol prefix is supported\n');
                return;
            }

            var gotResponse = false;
            var proxyReq = https.request(options);
            console.log('%s %s HTTP/1.1 ', proxyReq.method, proxyReq.path);

            proxyReq.on('response', function (proxyRes) {
                console.log('HTTP/1.1 %s', proxyRes.statusCode);
                gotResponse = true;

                var headers = {};
                proxy.eachHeader(proxyRes, function (key, value) {
                    console.log('Proxy Response Header: "%s: %s"', key, value);
                    if (proxy.isHopByHop.test(key)) {
                        console.log('ignoring hop-by-hop header "%s"', key);
                    } else {
                        var v = headers[key];
                        if (Array.isArray(v)) {
                            v.push(value);
                        } else if (null != v) {
                            headers[key] = [v, value];
                        } else {
                            headers[key] = value;
                        }
                    }
                });

                console.log('HTTP/1.1 %s', proxyRes.statusCode);
                res.writeHead(proxyRes.statusCode, headers);
                proxyRes.pipe(res);
                res.on('finish', onfinish);
            });
            proxyReq.on('error', function (err) {
                console.log('proxy HTTP request "error" event\n%s', err.stack || err);
                cleanup();
                if (gotResponse) {
                    console.log('already sent a response, just destroying the socket...');
                    socket.destroy();
                } else if ('ENOTFOUND' == err.code) {
                    console.log('HTTP/1.1 404 Not Found');
                    res.writeHead(404);
                    res.end();
                } else {
                    console.log('HTTP/1.1 500 Internal Server Error');
                    res.writeHead(500);
                    res.end();
                }
            });

            // if the client closes the connection prematurely,
            // then close the upstream socket
            function onclose() {
                console.log('client socket "close" event, aborting HTTP request to "%s"', req.url);
                proxyReq.abort();
                cleanup();
            }

            socket.on('close', onclose);

            function onfinish() {
                console.log('"finish" event');
                cleanup();
            }

            function cleanup() {
                console.log('cleanup');
                socket.removeListener('close', onclose);
                res.removeListener('finish', onfinish);
            }

            req.pipe(proxyReq);
        });
        if (errorCallback) {
            httpsProxyServer.on('error', errorCallback);
        }
        httpsProxyServer.on("connect", (req, socket, head) => {
            console.log(req.url);
        });
        httpsProxyServer.listen(Constants.MONITOR_PROXY_HTTPS_SERVER_PORT, successCallback);
    }
};