# Convert PDF to Images with Electron

This package uses the built in Chromium PDF viewer to render the PDFs, and uses Electrons capturePage to convert into images.
No extra libraries needed making this a good and lightweight solution for all Electron apps.

This should work on every OS Electron supports. Currently tested on Electron version 32.

## Installation

No extra library needed! Just install this small package!

```shell
npm install pdf2img-electron
```

## Usage

```js
import pdf from "pdf2img-electron"

const PDF = pdf("file.pdf")

PDF.name // -> returns the file name of the PDF
PDF.pages // -> returns the page count, e.g. 5
PDF.viewports // -> returns an array with the page sizes, e.g. [{ width: 595, height: 842 }]
PDF.metadata // -> returns an object with metadata from the PDF: title, author, etc.

PDF.toBitmap() // -> returns a promise with an array of Bitmap buffers
PDF.toPNG() // -> returns a promise with an array of PNG buffers
PDF.toJPEG() // -> returns a promise with an array of JPEG buffers
PDF.toDataURL() // -> returns a promise with an array of Data URL strings
PDF.toNativeImage() // -> returns a promise with an array of Electrons NativeImage
```

### Options

In the converter functions (e.g. `toPNG()`) you can pass some optional params:

-   `scale`: A number between 0.25 - 5 [Default: 1]
-   `page`: A number to only capture one specific page
-   `pages`: A number array of specific pages
-   `timeout`: A number to specify the PDF page load timeout in ms [Default: 70000]
-   `logging`: A boolean to enable/disable log feedback [Default: true]

## PDF to PNG Example

```js
import pdf from "pdf2img-electron"
import path from "path"
import fs from "fs"

async function pdfToImage() {
    const PDF_PATH = "path_to_file.pdf"
    const OUTPUT_PATH = "/output_folder_path"

    const PDF = pdf(PDF_PATH)
    const imageBuffers = await PDF.toPNG({ scale: 2 })

    for (let i = 0; i < imageBuffers.length; i++) {
        const image = imageBuffers[i]
        const p = path.join(OUTPUT_PATH, i + 1 + ".png")
        fs.writeFileSync(p, image)
    }
}
```
