const Constants = require("./src/commons/Constants");

// Modules to control application life and create native browser window
const {app, BrowserWindow, netLog} = require('electron');
app.commandLine.appendSwitch("proxy-server", `${Constants.MONITOR_PROXY_SERVER_IP}:${Constants.MONITOR_PROXY_ADAPTER_PORT}`);
app.commandLine.appendSwitch("ignore-certificate-errors");


let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1200, height: 720});

    // and load the index.html of the app.
    mainWindow.loadFile('src/renderers/index/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', e => {
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    app.quit();
});

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
