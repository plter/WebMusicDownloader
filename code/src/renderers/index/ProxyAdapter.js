const fs = require("fs");
const net = require("net");
const http = require("http");
const https = require("https");
const Constants = require("../../commons/Constants");
const url = require("url");
const path = require("path");
const electron = require("electron");

module.exports = class ProxyAdapter {

    constructor() {
    }

    start(
        proxyAdapterSuccessCallback,
        proxyAdapterErrorCallback,
        httpProxyServerSuccessCallback,
        httpProxyServerErrorCallback,
        httpsProxyServerSuccessCallback,
        httpsProxyServerErrorCallback
    ) {
        this.startHttpProxyServer(() => {
            httpProxyServerSuccessCallback();

            this.startHttpsProxyServer(() => {
                httpsProxyServerSuccessCallback();

                this.startAdapterServer(proxyAdapterSuccessCallback, proxyAdapterErrorCallback);
            }, httpsProxyServerErrorCallback);
        }, httpProxyServerErrorCallback);
    }

    startAdapterServer(successCallback, errorCallback) {
        let adapter = net.createServer(socket => {
            socket.once("data", buffer => {
                socket.pause();

                let protocol;
                const firstByte = buffer[0];
                switch (firstByte) {
                    case 22:
                    case 67:
                        protocol = 'https';
                        socket.unshift(buffer);
                        socket.pipe(net.createConnection(Constants.MONITOR_PROXY_HTTPS_SERVER_PORT)).pipe(socket);
                        socket.resume();
                        break;
                    case 71:
                    case 80:
                        protocol = 'http';
                        socket.unshift(buffer);
                        socket.pipe(net.createConnection(Constants.MONITOR_PROXY_HTTP_SERVER_PORT)).pipe(socket);
                        socket.resume();
                        break;
                    default:
                        console.log(firstByte);
                        console.error("Unsupported protocol");
                        socket.end();
                        break;
                }
            });
        });
        adapter.on('error', errorCallback);
        adapter.listen(Constants.MONITOR_PROXY_ADAPTER_PORT, successCallback);
    }

    startHttpProxyServer(successCallback, errorCallback) {

        let proxy = http.createServer((request, response) => {

            let parsed = url.parse(request.url);
            parsed.method = request.method;

            let proxyReq = http.request(parsed);
            proxyReq.on("response", destServerResponse => {
                destServerResponse.pipe(response);
            });
            request.pipe(proxyReq);
        });
        proxy.on('error', errorCallback);
        proxy.listen(Constants.MONITOR_PROXY_HTTP_SERVER_PORT, successCallback);
    }

    startHttpsProxyServer(successCallback, errorCallback) {
        let appDir = electron.remote.app.getAppPath();

        let proxy = https.createServer({
            key: fs.readFileSync(path.join(appDir, 'src', 'res', 'server.key')),
            cert: fs.readFileSync(path.join(appDir, 'src', 'res', 'server.crt'))
        }, (request, response) => {
            console.log(request.url);

            response.end("Hello World");

            //
            // let parsed = url.parse(request.url);
            // parsed.method = request.method;

            // let proxyReq = https.request(parsed);
            // proxyReq.on("response", destServerResponse => {
            //     destServerResponse.pipe(response);
            // });
            // request.pipe(proxyReq);
        });
        proxy.on('error', errorCallback);
        proxy.on("connect", (req, socket, head) => {
            console.log(req.url);
        });
        proxy.listen(Constants.MONITOR_PROXY_HTTPS_SERVER_PORT, successCallback);
    }
};