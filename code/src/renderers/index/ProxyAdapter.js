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
        let httpProxyServer = proxy.setup(http.createServer(), (url, req, res) => {
            if (this.onGotContent) {
                this.onGotContent(url, req, res);
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
        httpsProxyServer.on("request", proxy.httpsRequestHandler);
        if (errorCallback) {
            httpsProxyServer.on('error', errorCallback);
        }
        httpsProxyServer.on("connect", (req, socket, head) => {
            console.log(req.url);
        });
        httpsProxyServer.listen(Constants.MONITOR_PROXY_HTTPS_SERVER_PORT, successCallback);
    }
};