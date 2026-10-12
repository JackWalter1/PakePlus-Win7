const { contextBridge, ipcRenderer } = require('electron')

function reportEditing(editing) {
    ipcRenderer.sendToHost('vk-editing', !!editing)
}

try {
    contextBridge.exposeInMainWorld('__vkReport', reportEditing)
} catch (error) {
    window.__vkReport = reportEditing
}
