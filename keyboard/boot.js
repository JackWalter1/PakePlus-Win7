import { createApp, h } from 'vue'
import {
    ZhKeyboard,
    registerHandwritingRecognizer,
    registerPinyinEngine,
} from '@zh-keyboard/vue'
import { RimePinyinEngine } from '@zh-keyboard/pinyin'
import { ZhkRecognizer } from '@zh-keyboard/recognizer'

const wasmDir = String(window.electronAPI?.rimeDirUrl || '').replace(/\/$/, '')

const engine = new RimePinyinEngine({
    wasmDir,
    dictVersion: '2.1.2-luna',
})
registerPinyinEngine(engine)
registerHandwritingRecognizer(
    new ZhkRecognizer({
        modelPath: window.electronAPI?.handwriteModelUrl || '',
        dictPath: window.electronAPI?.handwriteDictUrl || '',
        backend: 'cpu',
    })
)

function activeWebview() {
    return document.querySelector('webview.tab-webview.active')
}

function isPasswordOpen() {
    const dialog = document.getElementById('password-dialog')
    return !!dialog && dialog.style.display === 'flex'
}

function sendKey(keyCode) {
    const webview = activeWebview()
    if (!webview) return
    webview.focus()
    webview.sendInputEvent({ type: 'keyDown', keyCode })
    webview.sendInputEvent({ type: 'keyUp', keyCode })
}

globalThis.__vkRoute = {
    shouldRedirect() {
        return !isPasswordOpen()
    },
    insertText(text) {
        const webview = activeWebview()
        if (!webview || !text) return
        webview.focus()
        const result = webview.insertText(text)
        if (result && typeof result.catch === 'function') {
            result.catch((error) => {
                console.error('虚拟键盘写入失败', error)
            })
        }
    },
    backspace() {
        sendKey('Backspace')
    },
}

function setKeyboardOpen(open) {
    document.body.classList.toggle('vk-open', open)
    const panel = document.getElementById('virtual-keyboard')
    if (panel) panel.classList.toggle('open', open)
}

document.addEventListener('virtual-keyboard-show', () => {
    setKeyboardOpen(true)
})

window.__vkApplyEditing = (editing) => {
    if (!editing && isPasswordOpen()) return
    setKeyboardOpen(!!editing)
}
window.__vkApplyEditing(!!window.__vkEditing)

async function syncKeyboardWithPage() {
    if (isPasswordOpen()) {
        setKeyboardOpen(true)
        return
    }
    const webview = activeWebview()
    if (!webview) {
        setKeyboardOpen(false)
        return
    }
    try {
        const editing = await webview.executeJavaScript(`(() => {
            const el = document.activeElement
            if (!el || el === document.body || el === document.documentElement) return false
            if (el.isContentEditable) return true
            if (el.tagName === 'TEXTAREA') return true
            if (el.tagName !== 'INPUT') return false
            const type = String(el.type || 'text').toLowerCase()
            return !['button','checkbox','color','file','hidden','image','radio','range','reset','submit'].includes(type)
        })()`)
        setKeyboardOpen(!!editing)
    } catch (error) {
        setKeyboardOpen(false)
    }
}

document.addEventListener('virtual-keyboard-sync', () => {
    syncKeyboardWithPage()
})

const passwordInput = document.getElementById('password-input')
if (passwordInput) {
    passwordInput.addEventListener('focus', () => {
        setKeyboardOpen(true)
    })
}

createApp({
    render() {
        return h(ZhKeyboard, {
            defaultMode: 'zh',
            enableHandwriting: true,
            position: 'static',
            disableWhenNoFocus: false,
        })
    },
}).mount('#virtual-keyboard-root')

const panel = document.getElementById('virtual-keyboard')
if (panel) {
    panel.addEventListener(
        'mousedown',
        (event) => {
            event.preventDefault()
        },
        true
    )
    panel.addEventListener(
        'pointerdown',
        (event) => {
            const button = event.target.closest('button')
            if (!button) return
            const alt = button.querySelector('img')?.getAttribute('alt') || ''
            if (alt !== 'Enter' && alt !== '回车') return
            if (panel.querySelector('.zhk-candidate__pinyin')) return
            if (isPasswordOpen()) {
                document.getElementById('password-confirm-btn')?.click()
                return
            }
            sendKey('Enter')
        },
        true
    )
}

engine.whenReady().catch((error) => {
    console.error('拼音引擎加载失败', error)
    if (panel) panel.setAttribute('data-engine-error', '拼音引擎加载失败')
})
