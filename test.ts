import path from "path"
import pdf from "./index"
import fs from "fs"

const TEST_PATH = path.join(__dirname, "tests")
const OUTPUT_PATH = path.join(TEST_PATH, "output")

const sizes = {
    // small: 0.25,
    normal: 1
    // large: 2,
    // huge: 5,
}

async function test() {
    const files = fs.readdirSync(TEST_PATH)

    for (let file of files) {
        if (file.endsWith(".pdf")) await renderPdf(file)
    }

    console.log("DONE!")
    process.exit()
}

async function renderPdf(file: string) {
    const PDF = pdf(path.join(TEST_PATH, file))

    console.log(">>> " + file)
    console.log("Name: " + PDF.name)
    console.log("Pages: " + PDF.pages)
    console.log("Viewports: " + JSON.stringify(PDF.viewports))
    console.log("Metadata: " + JSON.stringify(PDF.metadata))

    for (let i = 0; i < Object.keys(sizes).length; i++) {
        const [name, size] = Object.entries(sizes)[i]
        const PNG = await PDF.toPNG({ scale: size })

        for (let i = 0; i < PNG.length; i++) {
            const image = PNG[i]
            const p = path.join(OUTPUT_PATH, `${file}_${i + 1}_${name}.png`)
            fs.writeFileSync(p, image)
        }
    }
}

test()
