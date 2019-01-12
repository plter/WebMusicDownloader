// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const electron = require("electron");


class RendererMain {


    constructor() {
        this.initUI();

        this.resizeRootContainerByWindowInnerSize();
        this.addListeners();

        this._webview.src = "http://yunp.top";
    }

    initUI() {
        this._rootContainer = document.querySelector("#root-container");
        this._webview = document.querySelector("#webview");
        this._urlInputBarForm = document.querySelector("#url-input-bar");
        this._urlInput = this._urlInputBarForm["url"];
        this._btnBack = document.querySelector("#url-input-bar .btn-back");
        this._btnForward = document.querySelector("#url-input-bar .btn-forward");
    }

    addListeners() {
        window.onresize = this.resizeRootContainerByWindowInnerSize.bind(this);
        this._urlInputBarForm.onsubmit = this._urlInputBarForm_submitHandler.bind(this);
        this._webview.addEventListener("will-navigate", e => this._urlInput.value = e.url);
        this._webview.addEventListener("did-navigate", this._webview_didNavigateHandler.bind(this));
        this._btnBack.onclick = e => this._webview.goBack();
        this._btnForward.onclick = e => this._webview.goForward();
    }

    resizeRootContainerByWindowInnerSize() {
        this._rootContainer.style.height = `${window.innerHeight}px`;
    }

    _webview_didNavigateHandler(e) {
        this._urlInput.value = e.url;
        let webContents = this._webview.getWebContents();
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