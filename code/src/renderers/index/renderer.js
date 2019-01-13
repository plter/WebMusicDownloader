const electron = require("electron");
const http = require('http');
const Constants = require("../../commons/Constants");
const ProxyAdapter = require("./ProxyAdapter");

class RendererMain {

    constructor() {
        this.initUI();
        this.startNetworkMonitor();

        this.resizeRootContainerByWindowInnerSize();
        this.addListeners();
    }

    initUI() {
        this._rootContainer = document.querySelector("#root-container");
        this._webview = document.querySelector("#webview");
        this._urlInputBarForm = document.querySelector("#url-input-bar");
        this._urlInput = this._urlInputBarForm["url"];
        this._btnBack = document.querySelector("#url-input-bar .btn-back");
        this._btnForward = document.querySelector("#url-input-bar .btn-forward");
        this._monitorOutput = document.querySelector(".network-monitor .network-monitor-output");
    }

    addListeners() {
        window.onresize = this.resizeRootContainerByWindowInnerSize.bind(this);
        this._urlInputBarForm.onsubmit = this._urlInputBarForm_submitHandler.bind(this);
        this._webview.addEventListener("will-navigate", e => this._urlInput.value = e.url);
        this._webview.addEventListener("did-navigate", this._webview_didNavigateHandler.bind(this));
        this._btnBack.onclick = e => this._webview.goBack();
        this._btnForward.onclick = e => this._webview.goForward();
    }

    startNetworkMonitor() {
        let pa = new ProxyAdapter();
        pa.start(() => {
            this.monitorConsoleLog(`成功在端口 ${Constants.MONITOR_PROXY_ADAPTER_PORT} 建立代理服务器入口`);

            this._webview.src = "http://y.qq.com";

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
        pa.onConnectURL = (url, relatedRequest) => {
            this.monitorConsoleLog(`[得到]${url}`);
        };
    }

    monitorConsoleLog(msg) {
        this._monitorOutput.value += msg + "\n";
        this._monitorOutput.scrollTop = this._monitorOutput.scrollHeight;
    }

    resizeRootContainerByWindowInnerSize() {
        this._rootContainer.style.height = `${window.innerHeight}px`;
    }

    _webview_didNavigateHandler(e) {
        this._urlInput.value = e.url;
        let webContents = this._webview.getWebContents();
        webContents.on('new-window', function (event, url, frameName, disposition, options, additionalFeatures) {
            console.log(event.sender);
        });
    }

    _urlInputBarForm_submitHandler(e) {
        e.preventDefault();

        let url = this._urlInput.value;
        if (url) {
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = `http://${url}`;
            }
            this._webview.src = url;
            this._urlInput.value = url;
        }
    }
}

new RendererMain();