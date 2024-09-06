import { app, BrowserWindow, NativeImage } from "electron"
import { getPdfContent } from "./pdf"
import { initRendering } from "./render"

export type Size = { width: number; height: number }
export type Viewports = Size[]
export type PdfContent = { name: string; pages: number; viewports: Viewports; metadata: PdfMetadata }
export type ImageTypes = "bitmap" | "png" | "jpeg" | "dataURL" | "native"
export type PdfMetadata = { title: string; subject: string; author: string; keywords: string; creator: string; producer: string; creationDate: string; modDate: string }

export interface ReturnDataPDF {
    name: string
    pages: number
    viewports: Viewports
    metadata: PdfMetadata
    toBitmap: ToBitmap
    toPNG: ToPNG
    toJPEG: ToJPEG
    toDataURL: ToDataURL
    toNativeImage: ToNativeImage
}
type ToBitmap = (options?: ConverterOptionsInput) => Promise<Buffer[]>
type ToPNG = (options?: ConverterOptionsInput) => Promise<Buffer[]>
type ToJPEG = (options?: ConverterOptionsInput) => Promise<Buffer[]>
type ToDataURL = (options?: ConverterOptionsInput) => Promise<string[]>
type ToNativeImage = (options?: ConverterOptionsInput) => Promise<NativeImage[]>

interface ConverterOptionsInput {
    scale?: number // 0.25-5 (1)
    page?: number
    pages?: number[]
    timeout?: number
    logging?: boolean
}
export interface ConverterOptions extends ConverterOptionsInput {
    scale: number
    pages: number[]
}

/**
 * This function is used to get PDF contents & buffers.
 * @param filePath The file path to the PDF file
 * @returns If the promise succeeds it returns an object with PDF data/actions.
 */
function pdf(filePath: string): ReturnDataPDF {
    // check if valid pdf extension
    if (!filePath.match(/\.pdf$/i)) throw new Error("Invalid file path. Extension does not end with .pdf")

    let content: PdfContent = getPdfContent(filePath)
    return { ...content, toBitmap, toPNG, toJPEG, toDataURL, toNativeImage }

    async function toBitmap(options?: ConverterOptionsInput) {
        return (await convert(options, "bitmap")) as Buffer[]
    }

    async function toPNG(options?: ConverterOptionsInput) {
        return (await convert(options, "png")) as Buffer[]
    }

    async function toJPEG(options?: ConverterOptionsInput) {
        return (await convert(options, "jpeg")) as Buffer[]
    }

    async function toDataURL(options?: ConverterOptionsInput) {
        return (await convert(options, "dataURL")) as string[]
    }

    async function toNativeImage(options?: ConverterOptionsInput) {
        return (await convert(options, "native")) as NativeImage[]
    }

    function convert(options: ConverterOptionsInput = {}, type: ImageTypes): Promise<Buffer[] | string[] | NativeImage[]> {
        return new Promise(async (resolve, reject) => {
            const invalidOptions = checkOptions()
            if (invalidOptions) reject(invalidOptions)

            await app.whenReady()

            const windowOpts = { show: false, frame: false, skipTaskbar: true, webPreferences: { offscreen: true } }
            const window = new BrowserWindow(windowOpts)

            // add timeout as in some cases window is not fully ready to render
            setTimeout(async () => {
                try {
                    const rendered = await initRendering(filePath, content, options as ConverterOptions, window, type)

                    window.on("closed", () => {
                        resolve(rendered)
                    })
                    window.close()
                } catch (err) {
                    reject(err)
                }
            }, 200)
        })

        function checkOptions(): string | null {
            if (!options.scale) options.scale = 1
            else if (options.scale < 0.25 || options.scale > 5) return "Scale out of range, choose a number between 0.25-5"

            if (options.page === undefined) options.page = -1
            else if (options.page < 0 || options.page >= content.pages) return "Page index out of range, please input a number between 0-" + (content.pages - 1)

            if (options.pages === undefined) options.pages = options.page < 0 ? [] : [options.page]
            else if (options.pages.find((page) => page < 0 || page >= content.pages)) return "Page index in pages array out of range, please input a number between 0-" + (content.pages - 1)

            return null
        }
    }
}

export default pdf
