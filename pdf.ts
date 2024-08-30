import fs from "fs"
import { basename } from "path"
import { PdfContent, Size, Viewports } from "."

export function getPdfContent(pdfPath: string): PdfContent {
    let pdfData: string
    pdfData = fs.readFileSync(pdfPath, "utf8")

    const pageMatches = pdfData.match(/\/Type\s*\/Page[^s]/g) || []
    const mediaBoxMatches = pdfData.match(/\/MediaBox\s*\[(.*?)\]/g) || []
    // console.log(pageMatches, mediaBoxMatches)

    let viewports: Viewports = []
    for (let i = 0; i < mediaBoxMatches.length; i++) {
        let dimensions = getMediaBoxDimensions(mediaBoxMatches[i])
        if (dimensions) viewports.push(dimensions)
    }

    // pages might be double the actual mediabox size, but in cases where pages is less than mediabox, use that count
    if (pageMatches.length < viewports.length) viewports = viewports.slice(0, pageMatches.length)

    return { name: basename(pdfPath, ".pdf"), pages: viewports.length, viewports }
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
