import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'keyboard', 'dist')
const rimeSrc = path.join(root, 'node_modules', '@zh-keyboard', 'pinyin', 'data')
const rimeDest = path.join(outDir, 'rime')

function patchCore(source) {
    const helper = `function resolveHostInput(inputElement) {
	if (inputElement && typeof inputElement.value === "string") return inputElement;
	const dialog = document.getElementById("password-dialog");
	const password = document.getElementById("password-input");
	if (dialog && password && dialog.style.display !== "none") {
		password.focus();
		return password;
	}
	return null;
}
`
    const writeOriginal = `function writeToInputElement(inputElement, text) {
	processInputElement(inputElement, text);
}`
    const writePatched = `function writeToInputElement(inputElement, text) {
	if (globalThis.__vkRoute && globalThis.__vkRoute.shouldRedirect(inputElement)) {
		globalThis.__vkRoute.insertText(text);
		return;
	}
	const target = resolveHostInput(inputElement);
	if (!target) return;
	try {
		processInputElement(target, text);
	} catch (error) {
		target.value += text;
		target.dispatchEvent(new Event("input", { bubbles: true }));
	}
}`
    const deleteOriginal = `function delToInputElement(inputElement) {
	processInputElement(inputElement);
}`
    const deletePatched = `function delToInputElement(inputElement) {
	if (globalThis.__vkRoute && globalThis.__vkRoute.shouldRedirect(inputElement)) {
		globalThis.__vkRoute.backspace();
		return;
	}
	const target = resolveHostInput(inputElement);
	if (!target) return;
	try {
		processInputElement(target);
	} catch (error) {
		target.value = target.value.slice(0, -1);
		target.dispatchEvent(new Event("input", { bubbles: true }));
	}
}`
    if (!source.includes(writeOriginal) || !source.includes(deleteOriginal)) {
        throw new Error('zh-keyboard core layout changed; update scripts/bundle-keyboard.mjs')
    }
    return source.replace(writeOriginal, helper + writePatched).replace(deleteOriginal, deletePatched)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
fs.cpSync(rimeSrc, rimeDest, { recursive: true })
fs.copyFileSync(
    path.join(root, 'node_modules', '@zh-keyboard', 'vue', 'dist', 'style.css'),
    path.join(outDir, 'zh-keyboard.css')
)

await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['keyboard/boot.js'],
    bundle: true,
    format: 'esm',
    target: 'chrome108',
    define: {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    outfile: path.join(outDir, 'app.js'),
    plugins: [
        {
            name: 'patch-zh-keyboard-core',
            setup(build) {
                build.onLoad({ filter: /@zh-keyboard[\\/]core[\\/]dist[\\/]index\.mjs$/ }, async (args) => {
                    const source = await fs.promises.readFile(args.path, 'utf8')
                    return { contents: patchCore(source), loader: 'js' }
                })
            },
        },
    ],
})
