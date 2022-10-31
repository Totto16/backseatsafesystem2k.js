import * as display from "./display"
import { runProgramm } from "./main"
import * as Byte from "./builtins/Byte"
import * as Instruction from "./builtins/Instruction"
import { DrawHandle } from "./terminal"
import { OpCode } from "./opcodes.generated"
import { ENTRY_POINT } from "./address_constants"

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

function generateUI(array: Uint8ClampedArray, contentElement: HTMLElement) {
    
    const hoverOverElement = (element: HTMLElement, opCode : OpCode)=>{
        console.log(opCode)
    }

    const byteArray = [...array]
        .map((byte) => Byte.toHexString([byte], true, true, false))
        .join("")

    const readableByteCode: Array<[OpCode, Instruction.InstructionBytes]> =
        Instruction.chunkString(byteArray, Instruction.SIZE * 2).map((byte) => {
            const inst = Instruction.fromHexString(byte)
            const opcode = OpCode.fromInstruction(inst)
            return [opcode, Instruction.toBEBytes(inst)]
        })

    const addresses = new Array(Math.ceil(readableByteCode.length / 4))
        .fill(undefined)
        .map((_, i) => {
            return Instruction.toHexString(
                BigInt(ENTRY_POINT + i * Instruction.SIZE), false
            )
        })

        
    contentElement.innerHTML = `<div class="inst-container"><div class="inst-addresses">${addresses.map(
        (addr) => {
            return `<div class="address-lines">${addr}</div>`
        }
    ).join("")}</div><div class="inst-code">${readableByteCode
        .map(([opCode, bytes]) => {
            const code = bytes.map((byte) =>
                Byte.toHexString([byte], true, true, false)
            )

            return `<div class="outer-inst" onclick="console.log('${
                opCode.name
            }')">${code.join(" ")}</div>`
        })
        .join("")}</div>`

    console.log("generated UI successfully!")
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

            if (array.byteLength % Instruction.SIZE) {
                throw new Error(
                    `The file doesn't seem to have a valid length to fit instructions in: ${array.byteLength} % ${Instruction.SIZE} != 0`
                )
            }

            generateUI(array, contentElement)

            // TODO make buttons and checkboxes to manipulate the args, run , emit, json and the option like exit on halt

            const enableStepping = document.querySelector<HTMLInputElement>(
                'input#enable-stepping[type="checkbox"]'
            )

            const manuallyStep =
                enableStepping && enableStepping.checked
                    ? document.querySelector<HTMLButtonElement>(
                          "button#nextButton"
                      ) ?? undefined
                    : undefined

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
                manuallyStep
            )
        })
        .then(() => console.log("finished running the program"))
}

start()

export interface PseudoFile {
    file: File
    content: Uint8ClampedArray
}
