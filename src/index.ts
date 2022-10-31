import * as display from "./display"
import { runProgramm } from "./main"
import * as Byte from "./builtins/Byte"
import { DrawHandle } from "./terminal"

function getDrawHandle(uninitialized = false): DrawHandle {
    return [0, 1].map((_, index) => {
        const canvasElement: HTMLCanvasElement | null = document.querySelector(
            `canvas#console-${index + 1}`
        )
        if (canvasElement === null) {
            throw new Error("No canvas element was found!")
        }
        if (uninitialized) {
            canvasElement.height = display.HEIGHT
            canvasElement.width = display.WIDTH
            canvasElement.style.display = index === 1 ? "none" : "unset"
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

    fr.readAsArrayBuffer(file)

    if (!file.name.endsWith(".backseat")) {
        //TODO visualize this
        throw new Error("not a backseat file")
    }

    file.arrayBuffer()
        .then((content) => {
            const contentElement: HTMLParagraphElement | null =
                document.querySelector("p#contents")
            if (contentElement === null) {
                throw new Error("No paragraph element was found!")
            }

            const array = new Uint8ClampedArray(content)

            contentElement.innerText = [...array]
                .map((a) => Byte.toHexString([a]))
                .join(" ")

            // TODO make buttons and checkboxes to manipulate the args, run , emit, json and the option like exit on halt
            runProgramm(
                getDrawHandle(true),
                {
                    file,
                    content: array,
                },
                {
                    action: "Run",
                    arguments: { path: file.name, exitOnHalt: true },
                },
                document.querySelector<HTMLButtonElement>(
                    "button#nextButton"
                ) ?? undefined
            )
        })
        .then(() => console.log("finished running the program"))
}

start()

export interface PseudoFile {
    file: File
    content: Uint8ClampedArray
}
