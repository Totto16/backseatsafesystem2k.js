import { runProgramm } from "./main"
import * as terminal from "./terminal"

function start() {
    const canvasElement: HTMLCanvasElement | null =
        document.querySelector("canvas#console")
    if (canvasElement === null) {
        throw new Error("No canvas element was found!")
    }

    canvasElement.height = terminal.HEIGHT
    canvasElement.width = terminal.WIDTH

    const inputElement: HTMLInputElement | null = document.querySelector(
        "input#backseat-file"
    )
    if (inputElement === null) {
        throw new Error("No input element was found!")
    }

    inputElement.onchange = onChooseFile
}

function onChooseFile(_event: Event) {
    if (typeof window.FileReader !== "function") {
        throw "The file API isn't supported on this browser."
    }

    const inputElement: HTMLInputElement | null = document.querySelector(
        "input#backseat-file"
    )
    if (inputElement === null) {
        throw new Error("No input element was found!")
    }

    if (inputElement.files === null || inputElement.files?.length == 0) {
        throw "This browser does not support the `files` property of the file input."
    }

    let file = inputElement.files[0]
    let fr = new FileReader()

    fr.onload = function onFileLoad(event: ProgressEvent<FileReader>) {
        const contentElement: HTMLParagraphElement | null =
            document.querySelector("p#contents")
        if (contentElement === null) {
            throw new Error("No paragraph element was found!")
        }
        contentElement.innerText =
            event.target?.result?.toString() ?? "no content"
    }

    fr.readAsText(file)

    if (!file.name.endsWith(".backseat")) {
        //TODO visualize this
        throw new Error("not a backset file")
    }

    const canvasElement: HTMLCanvasElement | null =
        document.querySelector("canvas#console")
    if (canvasElement === null) {
        throw new Error("No canvas element was found!")
    }
    file.arrayBuffer().then((content) => {
        runProgramm(canvasElement, new Uint8Array(content))
    })
}

start()
