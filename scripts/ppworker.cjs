const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const ppconfig = require('./ppconfig.json')

// update package.json build productName
const updatePackageJson = async (appName, version) => {
    const packageJson = await fs.readJson(
        path.join(__dirname, '../', 'package.json')
    )
    packageJson.version = version
    packageJson.build.productName = appName
    await fs.writeJson(path.join(__dirname, '../', 'package.json'), packageJson)
}

// update package.json author and email
const updateAuthor = async (author, email) => {
    const packageJsonPath = path.join(__dirname, '../', 'package.json')
    const packageJson = await fs.readJson(packageJsonPath)
    packageJson.author = {
        name: author,
        email,
    }
    await fs.writeJson(packageJsonPath, packageJson)
    console.log('package.json author updated')
}

// update renderer.js DEFAULT_HOME_URL
const updateRendererJs = async (url) => {
    const rendererJs = await fs.readFile(
        path.join(__dirname, '../', 'renderer.js'),
        'utf8'
    )
    const newRendererJs = rendererJs.replace(
        /const DEFAULT_HOME_URL = '.*?'/, // 匹配任意url地址，需要使用正则表达式
        `const DEFAULT_HOME_URL = '${url}'`
    )
    console.log('newRendererJs:', newRendererJs)
    await fs.writeFile(
        path.join(__dirname, '../', 'renderer.js'),
        newRendererJs
    )
    console.log('renderer.js updated')
}

// update main.js defaultExitPassword
const updateMainJs = async (password) => {
    const mainJs = await fs.readFile(
        path.join(__dirname, '../', 'main.js'),
        'utf8'
    )
    console.log('mainJs:', mainJs)
    const newMainJs = mainJs.replace(
        /const defaultExitPassword = '.*?'/,
        `const defaultExitPassword = '${password}'`
    )
    console.log('newMainJs:', newMainJs)
    await fs.writeFile(path.join(__dirname, '../', 'main.js'), newMainJs)
    console.log('main.js updated')
}

// create icon
const createIcnsIcon = async () => {
    try {
        execSync(
            `node ${path.join(
                __dirname,
                '../',
                'scripts/createIcon.cjs'
            )} -icon ${path.join(
                __dirname,
                '../',
                'app-icon.png'
            )} -padding 1 -format icns`
        )
        console.log('🚀 icns icon created')
    } catch (error) {
        console.error('🚨 error creating icns icon:', error)
    }
}

const createIcoIcon = async () => {
    try {
        execSync(
            `node ${path.join(
                __dirname,
                '../',
                'scripts/createIcon.cjs'
            )} -icon ${path.join(
                __dirname,
                '../',
                'app-icon.png'
            )} -padding 1 -format ico`
        )
        console.log('🚀 ico icon created')
    } catch (error) {
        console.error('🚨 error creating ico icon:', error)
    }
}

// Main execution
const main = async () => {
    console.log('🚀 worker start')
    const { name, version, url, password, author, email } = ppconfig
    console.log('name:', name)
    console.log('version:', version)
    console.log('url:', url)
    console.log('password:', password)
    console.log('author:', author)
    console.log('email:', email)
    await updatePackageJson(name, version)
    await updateAuthor(author, email)
    await updateRendererJs(url)
    await updateMainJs(password)
    await createIcnsIcon()
    await createIcoIcon()
    console.log('🚀 worker end')
}

// run worker
main()
