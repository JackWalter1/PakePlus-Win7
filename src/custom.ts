import { contextBridge } from 'electron'

declare global {
    interface Window {
        electronAPI: {
            platform: NodeJS.Platform
            versions: {
                node: string
                chrome: string
                electron: string
            }
        }
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
})

window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded')
})

console.log(
    '%cbuild from PakePlus https://github.com/Sjj1024/PakePlus',
    'color:orangered;font-weight:bolder'
)

// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动
const hookClick = (e: MouseEvent) => {
    const origin = (e.target as HTMLElement | null)?.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

document.addEventListener('click', hookClick, { capture: true })
