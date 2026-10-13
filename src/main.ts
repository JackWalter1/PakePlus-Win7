import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import path from 'path'
import config from './config.json'

const WEBSITE_URL = config.url

let mainWindow: BrowserWindow | null

// create the window
async function createWindow() {
    const partition = config.incognito ? 'temp' : undefined

    mainWindow = new BrowserWindow({
        width: config.width,
        height: config.height,
        minWidth: config.minWidth,
        minHeight: config.minHeight,
        maxWidth: config.maxWidth,
        maxHeight: config.maxHeight,
        title: config.title,
        resizable: config.resizable,
        fullscreen: config.fullscreen,
        frame: config.decorations,
        transparent: config.transparent,
        titleBarStyle: config.titleBarStyle as never,
        closable: config.closable,
        minimizable: config.minimizable,
        maximizable: config.maximizable,
        alwaysOnTop: config.alwaysOnTop,
        center: config.center,
        hasShadow: config.shadow,
        skipTaskbar: config.skipTaskbar,
        tabbingIdentifier: config.tabbingIdentifier ?? undefined,
        acceptFirstMouse: config.acceptFirstMouse,
        webPreferences: {
            preload: path.join(__dirname, 'custom.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            devTools: config.devtools,
            backgroundThrottling: config.backgroundThrottling ?? undefined,
            // javascript: config.javascriptDisabled ? false : undefined,
            sandbox: true,
            partition,
        },
        show: false,
        backgroundColor: config.backgroundColor ?? '#ffffff',
    })

    // mainWindow.setContentProtection(config.contentProtected)

    // 强制使用配置里的标题，阻止网页标题覆盖
    const appTitle = config.title
    if (appTitle) {
        mainWindow.setTitle(appTitle)
    }

    // if pageTitle is true, prevent the page title from being updated
    mainWindow.on('page-title-updated', (event) => {
        event.preventDefault()
        if (appTitle && config.pageTitle) {
            mainWindow?.setTitle(appTitle)
        }
    })

    // 最小/最大尺寸：某些平台下用 setXXX 更稳定
    if (config.minWidth > 0 && config.minHeight > 0) {
        mainWindow.setMinimumSize(config.minWidth, config.minHeight)
    }
    if (config.maxWidth > 0 && config.maxHeight > 0) {
        mainWindow.setMaximumSize(config.maxWidth, config.maxHeight)
    }

    // userAgent 必须在 loadURL 前设置
    if (config.userAgent) {
        mainWindow.webContents.setUserAgent(config.userAgent)
    }

    // 代理（如有）
    if (config.proxyUrl) {
        await mainWindow.webContents.session.setProxy({
            proxyRules: config.proxyUrl,
        })
    }

    if (WEBSITE_URL) {
        mainWindow.loadURL(WEBSITE_URL)
    }

    mainWindow.once('ready-to-show', () => {
        if (config.maximized) {
            mainWindow?.maximize()
        }
        if (config.fullscreen) {
            mainWindow?.setFullScreen(true)
        }

        if (config.visible) {
            mainWindow?.show()
            if (config.focus) {
                mainWindow?.focus()
            }
        }

        if (config.openDevTools) {
            mainWindow?.webContents.openDevTools()
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })
}

// create the menu
function createMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: '文件',
            submenu: [
                {
                    label: '刷新',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow?.reload()
                    },
                },
                {
                    label: '强制刷新',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow?.webContents.reloadIgnoringCache()
                    },
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator:
                        process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit()
                    },
                },
            ],
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '实际大小',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow?.webContents.setZoomLevel(0)
                    },
                },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (!mainWindow) return
                        const currentZoom =
                            mainWindow.webContents.getZoomLevel()
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
                    },
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (!mainWindow) return
                        const currentZoom =
                            mainWindow.webContents.getZoomLevel()
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
                    },
                },
                { type: 'separator' },
                {
                    label: '开发者工具',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow?.webContents.toggleDevTools()
                    },
                },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        if (!mainWindow) return
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: config.title,
                            detail: '跨平台桌面应用\n支持 Windows 7',
                        })
                    },
                },
            ],
        },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// when the application is ready, create the window and the menu
app.whenReady().then(() => {
    // create the window
    createWindow()
    // create the menu
    // createMenu()
    // when the application is activated, create the window
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// when all windows are closed, quit the application
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// when a certificate error occurs, prevent it from being displayed
app.on(
    'certificate-error',
    (event, webContents, url, error, certificate, callback) => {
        event.preventDefault()
        callback(true)
    }
)
