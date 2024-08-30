# Convert PDF to Images with Electron

This package uses the built in Chromium PDF viewer to render the PDFs, and uses Electrons capturePage to convert into images.
No extra libraries needed making this a good and lightweight solution for all Electron apps.

## Installation

No extra library needed! Just install this small package!

```shell
npm install pdf2img-electron
```

## Usage

```js
import pdf from "pdf2img-electron"

const PDF = pdf("path_to_pdf")

PDF.name // -> returns the file name of the PDF
PDF.pages // -> returns the page count, e.g. 5
PDF.viewports // -> returns an array with the page sizes, e.g. [{ width: 595, height: 842 }]
PDF.toBitmap() // -> returns a promise with an array of bitmap buffers
PDF.toPNG() // -> returns a promise with an array of PNG buffers
PDF.toJPEG() // -> returns a promise with an array of JPEG buffers
PDF.toDataURL() // -> returns a promise with an array of data URL strings
```

## PDF to Images Example

```js
import pdf from "pdf2img-electron"
import path from "path"
import fs from "fs"

async function pdfToImage() {
    const PDF_PATH = "path_to_pdf"
    const OUTPUT_PATH = "output_folder_path"

    const PDF = pdf(PDF_PATH)
    const imageBuffers = await PDF.toPNG({ scale: 2 })

    for (let i = 0; i < imageBuffers.length; i++) {
        const image = imageBuffers[i]
        const p = path.join(OUTPUT_PATH, i + 1 + ".png")
        fs.writeFileSync(p, image)
    }
}
```

### Options

In the converter functions (e.g. `toPNG`) you can pass some optional options:

-   `scale`: A number between 0.25 - 5 [Default: 1]
-   `page`: Only capture a specific page
-   `pages`: An array of specific pages
