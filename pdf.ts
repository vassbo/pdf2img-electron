import fs from "fs"
import { basename } from "path"
import { PdfContent, PdfMetadata, Size, Viewports } from "."

export function getPdfContent(pdfPath: string): PdfContent {
    let pdfData: string
    pdfData = fs.readFileSync(pdfPath, "utf8")

    const pageMatches = pdfData.match(/\/Type\s*\/Page[^s]/g) || []
    const boxMatch = getBoxes()
    const metadata = getMetadata()

    let viewports: Viewports = []
    for (let i = 0; i < boxMatch.length; i++) {
        let dimensions = getMediaBoxDimensions(boxMatch[i])
        if (dimensions) viewports.push(dimensions)
    }

    // pages might be wrongly double the actual mediabox size,
    // but in cases where pages are less than mediabox or not double, use that count
    if (pageMatches.length && pageMatches.length < viewports.length) viewports = viewports.slice(0, pageMatches.length)
    else if (viewports.length && pageMatches.length > viewports.length && pageMatches.length !== viewports.length * 2) {
        ;[...Array(pageMatches.length - viewports.length)].forEach(() => {
            viewports.push(viewports[0])
        })
    }

    return { name: basename(pdfPath, ".pdf"), pages: viewports.length, viewports, metadata }

    function getBoxes() {
        const boxTypes = ["MediaBox", "CropBox", "BleedBox", "TrimBox", "ArtBox"]

        for (const type of boxTypes) {
            const regex = new RegExp(`/${type}\\s*\\[([^\\]]+)\\]`, "g")
            let boxes: string[] = []
            let match
            while ((match = regex.exec(pdfData)) !== null) {
                boxes.push(match[0].replace(/\n/g, " "))
            }

            if (boxes.length) return boxes
        }

        return []
    }

    function getMetadata() {
        let metadata: any = {}
        const keys = ["Title", "Subject", "Author", "Keywords", "Creator", "Producer", "CreationDate", "ModDate"]

        keys.forEach((key) => {
            let reg = new RegExp(`\\/${key}\\s*\\((.*?)\\)`)
            const metaValue = pdfData.match(reg)?.[1] || ""
            const objectKey = key[0].toLowerCase() + key.slice(1)

            metadata[objectKey] = metaValue
        })

        return metadata as PdfMetadata
    }
}

function getMediaBoxDimensions(mediaBox: string): Size | null {
    if (!mediaBox) return null

    // extract the MediaBox dimensions (e.g. [0 0 595.28 841.89])
    const dimensions =
        mediaBox
            .match(/\[(.*?)\]/)?.[1]
            .trim()
            .split(" ")
            .map(Number) || []

    // invalid dimensions
    if (dimensions.length !== 4) return null

    // get the actual width and height
    const width = dimensions[2] - dimensions[0]
    const height = dimensions[3] - dimensions[1]
    return { width: Math.round(width), height: Math.round(height) }
}
