const electron = require("electron");
const path = require("path");

module.exports = {
    showDonateWindow: function () {
        let win = new electron.remote.BrowserWindow({
            width: 390,
            height: 680,
            title: "捐助",
            parent: electron.remote.getCurrentWindow(),
            modal: true
        });
        win.loadFile(path.join(__dirname, "donate", "donate.html"));
    }
};