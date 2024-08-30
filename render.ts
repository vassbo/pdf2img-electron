import { BrowserWindow, NativeImage, Rectangle } from "electron"
import { ConverterOptions, ImageTypes, PdfContent } from "."

export function initRendering(filePath: string, content: PdfContent, options: ConverterOptions, window: BrowserWindow, type: ImageTypes): Promise<Buffer[] | string[]> {
    const PAGES = options.pages.length ? options.pages : [...Array(content.pages)].map((_, i) => i)
    let pageIndex = 0
    let buffers: Buffer[] | string[] = []

    // width must be at least the widest page to properly scale the contents
    let widestPage = 0
    content.viewports.forEach(({ width }) => {
        if (width > widestPage) widestPage = width
    })

    // this is needed to allow page to properly scroll into view
    const SCROLL_MARGIN = widestPage * options.scale + 200

    return new Promise((resolve, reject) => {
        if (widestPage === 0) {
            reject("Could not get page sizes.")
            return
        }

        window.webContents.on("did-fail-load", reject)
        window.webContents.on("did-finish-load", async () => {
            if (!reloaded) return

            console.time("pdf2img-electron: Rendered page " + (pageIndex + 1) + " in")
            try {
                await pdfHasLoaded()
            } catch (err) {
                reject(err)
                return
            }
            console.timeEnd("pdf2img-electron: Rendered page " + (pageIndex + 1) + " in")

            // give time for content scroll/fit after load (might be able to do some optimizations here)
            let extraDelay = options.scale > 1 ? options.scale * 400 : options.scale < 1 ? 800 : 200
            const SIZE = getScaledSize()
            if (SIZE.width > 2000 || SIZE.height > 2000) extraDelay += (SIZE.width + SIZE.height) * 0.4
            setTimeout(windowLoaded, extraDelay)
        })

        let reloaded: boolean = true
        setNewContent()

        function windowLoaded() {
            // fixed sizes in pixels
            const SCROLLBAR_WIDTH = content.pages > 1 ? 17 : 0
            const TOP_MARGIN = 3 * options.scale
            const BOTTOM_MARGIN = 5.5 * options.scale

            const windowSize = window.getBounds()
            const contentWidth = (windowSize.height - TOP_MARGIN - BOTTOM_MARGIN) * getAspectRatio()

            const y = TOP_MARGIN
            const height = windowSize.height - y - BOTTOM_MARGIN
            const x = windowSize.width / 2 - contentWidth / 2 - SCROLLBAR_WIDTH / 2
            const width = contentWidth

            let size = { x, y, width, height }

            capturePage(size)
        }

        function capturePage(size: Rectangle) {
            window.webContents
                .capturePage(size)
                .then((img) => {
                    let image = getImage(img)
                    buffers.push(image as any)
                    next()
                })
                .catch(reject)
        }

        function getImage(img: NativeImage) {
            if (type === "bitmap") return img.toBitmap()
            if (type === "png") return img.toPNG()
            if (type === "jpeg") return img.toJPEG(1)
            if (type === "dataURL") return img.toDataURL()

            reject("Incorrect image type:" + type)
            return ""
        }

        async function next() {
            pageIndex++
            if (pageIndex >= PAGES.length) return finish()

            reloaded = false
            await setNewContent()
            reloaded = true

            // window page content will not update if not reloading
            window.webContents.reload()
        }

        function finish() {
            resolve(buffers)
        }
    })

    async function setNewContent() {
        const SIZE = getScaledSize()
        let width = Math.floor(SIZE.width + SCROLL_MARGIN)
        let height = Math.floor(SIZE.height)

        return new Promise(async (resolve) => {
            const currentSize = window.getBounds()
            const newSize = currentSize.width !== width || currentSize.height !== height
            if (newSize) window.setSize(width, height)

            // give window some time to resize & new url some time to update
            setTimeout(() => window.loadFile(filePath, getQuery()), newSize ? 50 : 0)
            setTimeout(() => resolve(true), newSize ? 250 : 50)
        })
    }

    // check that there is any content as PDF loads after content has loaded
    function pdfHasLoaded() {
        const CHECK_INTERVAL = 150
        const LOAD_TIMEOUT = 90000

        return new Promise((resolve, reject) => {
            let nextActionTimeout = setTimeout(checkContent, CHECK_INTERVAL)
            let timedoutTimeout = setTimeout(timedout, LOAD_TIMEOUT)

            async function checkContent() {
                const capture = await getBitmap()

                if (!timedoutTimeout) return
                if (!capture) {
                    nextActionTimeout = setTimeout(checkContent, CHECK_INTERVAL)
                    return
                }

                // find any pixel that's not the same (gray)
                // white: [255, 255, 255, 255], black: [137, 80, 78, 71], gray: [89, 86, 82, 255]
                const FIRST_PIXEL_COLOR = capture[0] + capture[1] + capture[2] + capture[3] // 89+86+82+255
                if (!FIRST_PIXEL_COLOR) {
                    nextActionTimeout = setTimeout(checkContent, CHECK_INTERVAL)
                    return
                }

                for (let i = 0; i < capture.length; i += 4) {
                    const pixelColor = capture[i] + capture[i + 1] + capture[i + 2] + capture[i + 3]
                    if (pixelColor !== FIRST_PIXEL_COLOR) {
                        finish()
                        return
                    }
                }

                nextActionTimeout = setTimeout(checkContent, CHECK_INTERVAL)
            }

            function finish() {
                exit()
                resolve(true)
            }

            function timedout() {
                exit()
                reject("Timed out when loading page " + (pageIndex + 1))
            }

            function exit() {
                clearTimeout(nextActionTimeout)
                clearTimeout(timedoutTimeout)
            }

            async function getBitmap() {
                // remove scroll bar
                let size = window.getBounds()
                size = { x: 0, y: 0, width: size.width - 20, height: size.height }

                try {
                    return (await window.webContents.capturePage(size)).getBitmap()
                } catch (err) {
                    exit()
                    reject(err)
                }
            }
        })
    }

    function getScaledSize() {
        return { width: content.viewports[PAGES[pageIndex]].width * options.scale, height: content.viewports[PAGES[pageIndex]].height * options.scale }
    }

    function getAspectRatio() {
        return content.viewports[PAGES[pageIndex]].width / content.viewports[PAGES[pageIndex]].height
    }

    function getQuery() {
        return { hash: `#toolbar=0&view=fit&page=${PAGES[pageIndex] + 1}&zoom=${options.scale * 100}` }
    }
}
