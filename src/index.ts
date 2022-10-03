import { runProgramm } from "./main"
import * as terminal from "./terminal"
import { DrawHandle } from "./terminal"

function getDrawHandle(uninitialized = false): DrawHandle {
    return [0, 1].map((_) => {
        const canvasElement: HTMLCanvasElement | null =
            document.querySelector("canvas#console")
        if (canvasElement === null) {
            throw new Error("No canvas element was found!")
        }
        if (uninitialized) {
            canvasElement.height = terminal.HEIGHT
            canvasElement.width = terminal.WIDTH
        }
        return canvasElement
    }) as DrawHandle
}

function start() {
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

    file.arrayBuffer().then((content) => {
        runProgramm(getDrawHandle(true), new Uint8ClampedArray(content))
    })
}

start()
