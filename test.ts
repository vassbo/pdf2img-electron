import path from "path"
import pdf from "./index"
import fs from "fs"

const TEST_PATH = path.join(__dirname, "tests")
const OUTPUT_PATH = path.join(TEST_PATH, "output")

async function test() {
    const PDF = pdf(path.join(TEST_PATH, "test.pdf"))

    console.log("Name: " + PDF.name)
    console.log("Pages: " + PDF.pages)
    console.log("Viewports: " + JSON.stringify(PDF.viewports))

    const sizes = {
        normal: 1,
        large: 2,
        // small: 0.25,
        // huge: 5,
    }

    for (let i = 0; i < Object.keys(sizes).length; i++) {
        const [name, size] = Object.entries(sizes)[i]
        const PNG = await PDF.toPNG({ scale: size })

        for (let i = 0; i < PNG.length; i++) {
            const image = PNG[i]
            const p = path.join(OUTPUT_PATH, i + 1 + "_" + name + ".png")
            fs.writeFileSync(p, image)
        }
    }

    console.log("DONE!")
    process.exit()
}

test()
