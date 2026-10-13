// renderer.js
const tabBar = document.getElementById('tabs-container') || document.getElementById('tab-bar')
const tabContent = document.getElementById('tab-content')
let tabIdCounter = 0
// 定义默认主页URL
const DEFAULT_HOME_URL = 'https://www.baidu.com'

/**
 * 添加新的标签页
 * @param {string} url - 默认加载的 URL
 */
// renderer.js (更新 addNewTab 函数)

function addNewTab(url) {
    console.log('addNewTab-----', url)
    tabIdCounter++
    const tabId = `tab-${tabIdCounter}`
    console.log('tabId-----', tabId)
    // 1. 创建标签页元素容器
    const tabEl = document.createElement('div')
    tabEl.className = 'tab'
    tabEl.id = `header-${tabId}`
    tabEl.onclick = () => activateTab(tabId)

    // Chrome 式左右凹角 + 分隔线
    const curveLeft = document.createElement('span')
    curveLeft.className = 'tab-curve-left'
    const curveRight = document.createElement('span')
    curveRight.className = 'tab-curve-right'
    const divider = document.createElement('span')
    divider.className = 'tab-divider'

    // 创建标题文本
    const titleSpan = document.createElement('span')
    titleSpan.textContent = '新标签页' // 初始标题
    titleSpan.className = 'tab-title'

    // 创建关闭按钮
    const closeBtn = document.createElement('span')
    closeBtn.textContent = '×' // 使用 '×' 作为关闭符号
    closeBtn.className = 'close-btn'
    // 阻止点击关闭按钮时触发标签页激活
    closeBtn.onclick = (event) => {
        event.stopPropagation() // 阻止事件冒泡到 tabEl 的 onclick
        closeTab(tabId)
    }

    // 将标题和关闭按钮添加到标签页元素中
    tabEl.appendChild(curveLeft)
    tabEl.appendChild(curveRight)
    tabEl.appendChild(divider)
    tabEl.appendChild(titleSpan)
    // 第一个tab不显示关闭按钮
    if (tabIdCounter > 1) {
        tabEl.appendChild(closeBtn)
    }

    tabBar.appendChild(tabEl)

    // ... (WebView 创建逻辑保持不变) ...

    const webview = document.createElement('webview')
    webview.className = 'tab-webview'
    webview.id = tabId
    if (window.electronAPI && window.electronAPI.webviewKeyboardPreload) {
        webview.preload = window.electronAPI.webviewKeyboardPreload
    }
    webview.src = url
    webview.setAttribute('allowpopups', 'on')

    // 关键：监听 webview 事件
    setupWebviewListeners(webview, titleSpan) // 注意：现在传入的是 titleSpan

    tabContent.appendChild(webview)

    // 3. 激活新标签
    activateTab(tabId)
}

/**
 * 激活指定的标签页
 * @param {string} targetId - 要激活的 webview ID
 */
function activateTab(targetId) {
    // 移除所有激活状态
    document
        .querySelectorAll('.tab')
        .forEach((t) => t.classList.remove('active'))
    document
        .querySelectorAll('.tab-webview')
        .forEach((w) => w.classList.remove('active'))

    // 设置目标激活状态
    document.getElementById(`header-${targetId}`).classList.add('active')
    document.getElementById(targetId).classList.add('active')
}

// 初始化工具栏按钮
function initToolbarButtons() {
    // 主页按钮
    document.getElementById('home-btn').addEventListener('click', () => {
        const activeTab = document.querySelector('.tab.active')
        if (activeTab) {
            const targetId = activeTab.id.replace('header-', '')
            const webviewEl = document.getElementById(targetId)
            if (webviewEl) {
                webviewEl.src = DEFAULT_HOME_URL
            }
        }
    })

    // 刷新按钮
    document.getElementById('reload-btn').addEventListener('click', () => {
        const activeTab = document.querySelector('.tab.active')
        if (activeTab) {
            const targetId = activeTab.id.replace('header-', '')
            const webviewEl = document.getElementById(targetId)
            if (webviewEl) {
                webviewEl.reload()
            }
        }
    })

    // 开发者工具按钮
    // document.getElementById('devtools-btn').addEventListener('click', () => {
    //     if (window.electronAPI && window.electronAPI.send) {
    //         window.electronAPI.send('toggle-devtools')
    //     }
    // })

    // 退出按钮
    document.getElementById('exit-btn').addEventListener('click', () => {
        // 直接显示密码对话框
        const passwordDialog = document.getElementById('password-dialog')
        const passwordInput = document.getElementById('password-input')
        const errorMessage = document.getElementById('error-message')

        if (passwordDialog) {
            passwordDialog.style.display = 'flex'
            document.dispatchEvent(new CustomEvent('virtual-keyboard-show'))
            if (passwordInput) {
                passwordInput.value = ''
                passwordInput.focus()
            }
            if (errorMessage) {
                errorMessage.style.display = 'none'
            }
        }
    })

    // 初始化密码对话框按钮（如果还没有初始化）
    const passwordConfirmBtn = document.getElementById('password-confirm-btn')
    const passwordCancelBtn = document.getElementById('password-cancel-btn')
    const passwordInput = document.getElementById('password-input')

    if (
        passwordConfirmBtn &&
        !passwordConfirmBtn.hasAttribute('data-initialized')
    ) {
        passwordConfirmBtn.setAttribute('data-initialized', 'true')
        passwordConfirmBtn.addEventListener('click', () => {
            const password = passwordInput ? passwordInput.value : ''
            if (window.electronAPI && window.electronAPI.send) {
                window.electronAPI.send('verify-password', password)
            }
        })
    }

    if (
        passwordCancelBtn &&
        !passwordCancelBtn.hasAttribute('data-initialized')
    ) {
        passwordCancelBtn.setAttribute('data-initialized', 'true')
        passwordCancelBtn.addEventListener('click', () => {
            const passwordDialog = document.getElementById('password-dialog')
            if (passwordDialog) {
                passwordDialog.style.display = 'none'
                document.dispatchEvent(new CustomEvent('virtual-keyboard-sync'))
            }
        })
    }

    // 密码输入框回车键处理
    if (passwordInput && !passwordInput.hasAttribute('data-initialized')) {
        passwordInput.setAttribute('data-initialized', 'true')
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                passwordConfirmBtn.click()
            }
        })
    }
}

// 监听主页事件（从菜单栏触发）
document.addEventListener('webview-home', () => {
    console.log('webview-home event received')
    // 找到当前激活的标签页
    const activeTab = document.querySelector('.tab.active')
    if (activeTab) {
        // 从header ID获取webview ID (例如: "header-tab-1" -> "tab-1")
        const targetId = activeTab.id.replace('header-', '')
        const webviewEl = document.getElementById(targetId)
        if (webviewEl) {
            webviewEl.src = DEFAULT_HOME_URL
        } else {
            console.log('webviewEl not found-----')
        }
    } else {
        console.log('activeTab not found-----')
    }
})

// 监听刷新事件（从菜单栏触发）
document.addEventListener('webview-reload', () => {
    console.log('webview-reload event received')
    // 找到当前激活的标签页
    const activeTab = document.querySelector('.tab.active')
    if (activeTab) {
        // 从header ID获取webview ID (例如: "header-tab-1" -> "tab-1")
        const targetId = activeTab.id.replace('header-', '')
        const webviewEl = document.getElementById(targetId)
        if (webviewEl) {
            // 刷新当前webview
            webviewEl.reload()
        } else {
            console.log('webviewEl not found-----')
        }
    } else {
        console.log('activeTab not found-----')
    }
})

// renderer.js (接着上面的代码)

/**
 * 设置 webview 的事件监听器
 * @param {HTMLElement} webview - webview 元素
 * @param {HTMLElement} tabEl - 对应的标签头元素
 */
function setupWebviewListeners(webview, tabEl) {
    // 监听页面请求新窗口事件 (例如：target="_blank" 的链接)
    webview.addEventListener('new-window', (e) => {
        // e.preventDefault()
        console.log('new-window----', e)
        // 在新标签页中打开新窗口的 URL
        addNewTab(e.detail.url)
    })

    // 监听页面加载完成，获取标题
    webview.addEventListener('dom-ready', () => {
        // 也可以在这里执行一些脚本，例如自定义右键菜单
        console.log('dom-ready-----')
        webview
            .executeJavaScript(`(() => {
                const blocked = { button:1, checkbox:1, color:1, file:1, hidden:1, image:1, radio:1, range:1, reset:1, submit:1 }
                const editable = (element) => {
                    let current = element
                    while (current && current !== document.body) {
                        if (current.isContentEditable) return true
                        const tag = current.tagName
                        if (tag === 'TEXTAREA') return true
                        if (tag === 'INPUT') {
                            const type = String(current.type || 'text').toLowerCase()
                            return !blocked[type]
                        }
                        current = current.parentElement
                    }
                    return false
                }
                const publish = (element) => {
                    if (typeof window.__vkReport === 'function') window.__vkReport(editable(element))
                }
                if (!window.__vkHooked) {
                    window.__vkHooked = true
                    document.addEventListener('focusin', (event) => publish(event.target), true)
                    document.addEventListener('pointerdown', (event) => publish(event.target), true)
                }
                publish(document.activeElement)
            })()`)
            .catch((error) => {
                console.log('vk hook failed', error)
            })
    })

    webview.addEventListener('ipc-message', (event) => {
        if (event.channel !== 'vk-editing') return
        const editing = !!event.args[0]
        window.__vkEditing = editing
        if (typeof window.__vkApplyEditing === 'function') {
            window.__vkApplyEditing(editing)
        }
    })

    // 监听页面导航，更新标签标题
    webview.addEventListener('page-title-updated', (e) => {
        console.log('page-title-updated-----', e.title)
        tabEl.textContent = e.title.substring(0, 6) + '...' // 截断标题，防止过长
    })

    // 添加右键菜单
    webview.addEventListener('context-menu', (e) => {
        console.log('context-menu-----', e)
        // 发送事件到主进程
        window.electronAPI.send('context-menu', e)
        // 阻止默认右键菜单
        e.preventDefault()
    })
}

// renderer.js (新增 closeTab 函数)

/**
 * 关闭指定的标签页和 webview
 * @param {string} targetId - 要关闭的 webview ID
 */
function closeTab(targetId) {
    const tabEl = document.getElementById(`header-${targetId}`)
    const webviewEl = document.getElementById(targetId)

    if (!tabEl || !webviewEl) return

    // 检查是否是当前激活的标签页
    const wasActive = tabEl.classList.contains('active')

    // 1. 移除元素
    tabEl.remove()
    webviewEl.remove()

    // 2. 如果关闭的是当前激活的标签页，则需要激活另一个标签页
    if (wasActive) {
        // 尝试激活下一个标签页
        const nextTab = tabBar.querySelector('.tab')
        if (nextTab) {
            // 从 header ID 获取 webview ID (例如: "header-tab-1" -> "tab-1")
            const nextTabId = nextTab.id.replace('header-', '')
            activateTab(nextTabId)
        } else {
            // 如果所有标签页都关闭了，则自动新建一个默认标签页
            addNewTab(DEFAULT_HOME_URL)
        }
    }
}

// 初始创建一个默认标签页
addNewTab(DEFAULT_HOME_URL)

// 初始化工具栏按钮
initToolbarButtons()
