const electron = require("electron");
const http = require('http');
const Constants = require("../../commons/Constants");
const ProxyAdapter = require("./ProxyAdapter");
const url = require("url");

class RendererMain {

    constructor() {
        this.initProperties();
        this.initUI();
        this.startNetworkMonitor();

        this.resizeRootContainerByWindowInnerSize();
        this.addListeners();
    }

    initProperties() {
        this._monitorConsoleExpanded = false;
    }

    initUI() {
        this._rootContainer = document.querySelector("#root-container");
        this._webview = document.querySelector("#webview");
        this._urlInputBarForm = document.querySelector("#url-input-bar");
        this._urlInput = this._urlInputBarForm["url"];
        this._btnBack = document.querySelector("#url-input-bar .btn-back");
        this._btnForward = document.querySelector("#url-input-bar .btn-forward");
        this._networkMonitorContainer = document.querySelector(".network-monitor");
        this._monitorOutput = document.querySelector(".network-monitor .network-monitor-output");
        this._btnToggleMonitorConsole = document.querySelector("#btn-toggle-monitor-console");
    }

    addListeners() {
        window.onresize = this.resizeRootContainerByWindowInnerSize.bind(this);
        this._urlInputBarForm.onsubmit = this._urlInputBarForm_submitHandler.bind(this);
        this._webview.addEventListener("will-navigate", e => this._urlInput.value = e.url);
        this._webview.addEventListener("did-navigate", this._webview_didNavigateHandler.bind(this));
        this._btnBack.onclick = e => this._webview.goBack();
        this._btnForward.onclick = e => this._webview.goForward();
        this._btnToggleMonitorConsole.onclick = this._btnToggleMonitorConsole_clickHandler.bind(this);
    }

    startNetworkMonitor() {
        let pa = new ProxyAdapter();
        pa.start(() => {
            this.monitorConsoleLog(`成功在端口 ${Constants.MONITOR_PROXY_ADAPTER_PORT} 建立代理服务器入口`);

            this._webview.src = "http://music.163.com";

        }, e => {
            if (e.code === 'EADDRINUSE') {
                this.monitorConsoleLog(`[错误]端口 ${Constants.MONITOR_PROXY_ADAPTER_PORT} 被占用`);
            }
            this.monitorConsoleLog("建立代理服务器入口失败");
        }, () => {
            this.monitorConsoleLog(`成功在端口 ${Constants.MONITOR_PROXY_HTTPS_SERVER_PORT} 建立 HTTPS 代理服务器`);
        }, e => {
            if (e.code === 'EADDRINUSE') {
                this.monitorConsoleLog(`[错误]端口 ${Constants.MONITOR_PROXY_ADAPTER_PORT} 被占用`);
            }
            this.monitorConsoleLog("建立 HTTPS 代理服务器失败");
        });
        pa.onGotContent = (urlString, relatedRequest, relatedResponse) => {
            let contentType = relatedResponse.headers['content-type'] || "";
            let contentLength = parseInt(relatedResponse.headers['content-length'] || "0");

            let parsedUrl = url.parse(urlString);
            let pathname = parsedUrl.pathname ? parsedUrl.pathname.toLowerCase() : "";
            if (pathname.endsWith(".mp3") || pathname.endsWith("m4a") || contentType.startsWith("audio")) {
                if (contentLength > 1000000) {
                    this.monitorConsoleLog(`[找到]${urlString}`);
                } else if (contentLength > 0) {
                    this.monitorConsoleLog(`[提示]音乐文件小于 1M，已忽略。${urlString}`);
                } else {
                    this.monitorConsoleLog(`[提示]无效音乐文件，已忽略。${urlString}`);
                }
            }
        };
    }

    monitorConsoleLog(msg) {
        this._monitorOutput.value += msg + "\n";
        this._monitorOutput.scrollTop = this._monitorOutput.scrollHeight;
    }

    resizeRootContainerByWindowInnerSize() {
        this._rootContainer.style.height = `${window.innerHeight}px`;
    }


    loadFromUrl(url) {
        this._webview.src = url;
        this._urlInput.value = url;
    }

    _webview_didNavigateHandler(e) {
        this._urlInput.value = e.url;
        let webContents = this._webview.getWebContents();
        webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
            if (disposition == "foreground-tab") {
                this.loadFromUrl(url);
            }
        });
    }

    _urlInputBarForm_submitHandler(e) {
        e.preventDefault();

        let url = this._urlInput.value;
        if (url) {
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = `http://${url}`;
            }
            this.loadFromUrl(url);
        }
    }

    _btnToggleMonitorConsole_clickHandler(e) {
        if (!this._monitorConsoleExpanded) {
            this._networkMonitorContainer.style.height = "600px";
            this._btnToggleMonitorConsole.innerHTML = "v";
            this._monitorConsoleExpanded = true;
        } else {
            this._networkMonitorContainer.style.height = "100px";
            this._btnToggleMonitorConsole.innerHTML = "^";
            this._monitorConsoleExpanded = false;
        }
    }
}

new RendererMain();