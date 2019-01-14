const electron = require("electron");
const http = require('http');
const https = require('https');
const Constants = require("../../commons/Constants");
const ProxyAdapter = require("./ProxyAdapter");
const url = require("url");
const os = require("os");
const path = require("path");
const fs = require("fs");
const Windows = require("../Windows");

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

        this._inputSaveDir = document.querySelector("#save-dir");
        this._btnBrowserForSaveDir = document.querySelector("#btn-browse-for-save-dir");
        this._webMusicDownloadDir = this.readMusicDownloadDirFromLS();
        this._inputSaveDir.value = this._webMusicDownloadDir;

        this._btnDonate = document.querySelector("#btn-donate");
    }

    addListeners() {
        window.onresize = this.resizeRootContainerByWindowInnerSize.bind(this);
        this._urlInputBarForm.onsubmit = this._urlInputBarForm_submitHandler.bind(this);
        this._webview.addEventListener("will-navigate", e => this._urlInput.value = e.url);
        this._webview.addEventListener("did-navigate", this._webview_didNavigateHandler.bind(this));
        this._btnBack.onclick = e => this._webview.goBack();
        this._btnForward.onclick = e => this._webview.goForward();
        this._btnToggleMonitorConsole.onclick = this._btnToggleMonitorConsole_clickHandler.bind(this);
        this._btnBrowserForSaveDir.onclick = this._btnBrowserForSaveDir_clickHandler.bind(this);
        this._btnDonate.onclick = e => Windows.showDonateWindow();
    }

    startNetworkMonitor() {
        let pa = new ProxyAdapter();
        pa.start(() => {
            this.monitorConsoleLog(`成功在端口 ${Constants.MONITOR_PROXY_ADAPTER_PORT} 建立代理服务器入口`);
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
            let contentType = (relatedResponse.headers['content-type'] || "").toLowerCase();
            let contentLength = parseInt(relatedResponse.headers['content-length'] || "0");

            let parsedUrl = url.parse(urlString);
            let pathname = parsedUrl.pathname ? parsedUrl.pathname.toLowerCase() : "";
            if (pathname.endsWith(".mp3") || pathname.endsWith(".m4a") || pathname.endsWith(".mp4") || contentType.startsWith("audio") || contentType.startsWith("video")) {
                if (contentLength > 1000000) {
                    this.monitorConsoleLog(`[找到]${urlString}`);
                    let filename = path.basename(pathname);
                    let localDestFileAbsolutePath = path.join(this._getWebMusicDownloadDir(), filename);

                    if (!fs.existsSync(localDestFileAbsolutePath)) {
                        let conn = parsedUrl.protocol == "https:" ? https.get(urlString) : http.get(urlString);
                        conn.on("response", res => {
                            res.pipe(fs.createWriteStream(localDestFileAbsolutePath));
                        });
                        this.monitorConsoleLog(`[提示]正在下载到 ${localDestFileAbsolutePath}`);
                    } else {
                        this.monitorConsoleLog(`[提示] ${localDestFileAbsolutePath} 已存在`);
                    }
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

    _setWebMusicDownloadDir(path) {
        this._webMusicDownloadDir = path;
        this._inputSaveDir.value = path;
        this.writeMusicDownloadDirToLS(path);
    }

    writeMusicDownloadDirToLS(path) {
        localStorage.setItem("wmd.musicDownloadDir", path);
    }

    readMusicDownloadDirFromLS() {
        let dir = localStorage.getItem("wmd.musicDownloadDir") || path.join(os.homedir(), "WebMusicDownload");
        let mkdirs = dir => {
            if (fs.existsSync(dir)) {
                return;
            }
            let parent = path.dirname(dir);
            if (!fs.existsSync(parent)) {
                mkdirs(parent);
            }
            fs.mkdirSync(dir);
        };
        mkdirs(dir);
        return dir;
    }

    _getWebMusicDownloadDir() {
        return this._webMusicDownloadDir;
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
            this._btnToggleMonitorConsole.innerHTML = "<span class='fa fa-toggle-down'></span>";
            this._monitorConsoleExpanded = true;
        } else {
            this._networkMonitorContainer.style.height = "100px";
            this._btnToggleMonitorConsole.innerHTML = "<span class='fa fa-toggle-up'></span>";
            this._monitorConsoleExpanded = false;
        }
    }

    _btnBrowserForSaveDir_clickHandler(e) {
        let paths = electron.remote.dialog.showOpenDialog(electron.remote.getCurrentWindow(), {
            title: "选择保存目录",
            properties: ['openDirectory', 'createDirectory', 'promptToCreate']
        });

        if (paths && paths.length) {
            this._setWebMusicDownloadDir(paths[0]);
        }
    }
}

new RendererMain();