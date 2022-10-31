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

    const romList: HTMLUListElement | null =
        document.querySelector("ul#rom-list")
    if (romList === null) {
        throw new Error("No rom list element was found!")
    }

    const allRoms = Array.from(romList.children) as HTMLElement[]

    allRoms.forEach((rom: HTMLElement) => {
        rom.onclick = () => {
            const name = rom.innerText
            fetchFile(name).then((arr) => loadProgramm(arr, name))
        }
    })
}

function generateUI(array: Uint8ClampedArray, contentElement: HTMLElement) {
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
                BigInt(ENTRY_POINT + i * Instruction.SIZE),
                false
            )
        })

    const root = document.createElement("div")
    root.className = "inst-container"

    const addressDiv = document.createElement("div")
    addressDiv.className = "inst-addresses"

    addresses.forEach((addr) => {
        const singleAddress = document.createElement("div")
        singleAddress.className = "address-lines"
        singleAddress.innerHTML = addr

        addressDiv.appendChild(singleAddress)
    })

    root.appendChild(addressDiv)

    const codeDiv = document.createElement("div")
    codeDiv.className = "inst-code"

    readableByteCode.forEach(([opCode, bytes]) => {
        const singleInst = document.createElement("div")
        singleInst.className = "outer-inst"

        const info = opCode.getDescription()

        const instBytes = Instruction.toBEBytes(opCode.asInstruction())
        const code: string[] = []

        let i = 0
        for (const [name, value, type, byteLength] of info) {
            const bytes = instBytes.slice(i, i + byteLength)

            code.push(
                `<div class="inner-inst" type="${type}">${bytes
                    .map((byte) => Byte.toHexString([byte], true, true, false))
                    .join(
                        " "
                    )}<span class="tooltip">${name}: ${value.toString()}</span></div>`
            )
            i += byteLength
        }

        if (i != Instruction.SIZE) {
            code.push(
                `<div class="inner-inst" type="nothing">${instBytes
                    .slice(i)
                    .map((byte) => Byte.toHexString([byte], true, true, false))
                    .join(" ")}<span class="tooltip">not used</span></div>`
            )
        }

        /*      const hoverChild = document.createElement("div")
        hoverChild.className = "hover-inst"

        const hoverName = document.createElement("div")
        hoverName.className = "inst-name"
        hoverName.innerHTML = opCode.name

        hoverChild.appendChild(hoverName)

        for (const [key, value] of Object.entries(opCode.parsedInstruction)) {
            console.log(key, ["cycles", "increment", "opCode"].includes(key))
            if (["cycles", "increment", "opCode"].includes(key)) {
                continue
            }
            const singleEl = document.createElement("div")
            singleEl.className = "inst-attr"
            singleEl.setAttribute(key, value)
            singleEl.innerHTML = `<span>${key}: ${value}</span>`

            hoverChild.appendChild(singleEl)
        } */

        /*         singleInst.onmouseenter = () => {
            singleInst.appendChild(hoverChild)
        }

        singleInst.onmouseleave = () => {
            singleInst.removeChild(hoverChild)
        } */

        singleInst.innerHTML = code.join(" ")

        codeDiv.appendChild(singleInst)
    })

    root.appendChild(codeDiv)

    contentElement.appendChild(root)
}

async function fetchFile(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url)
    if (!resp.ok || resp.status < 200 || resp.status >= 400) {
        throw new Error(`Fetching ${url} went wrong: ${resp}`)
    }

    return (await resp.blob()).arrayBuffer()
}

async function onChooseFile(_event: Event) {
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

    const content = await file.arrayBuffer()

    loadProgramm(content, file.name)
}

async function loadProgramm(content: ArrayBuffer, name: string) {
    const contentElement: HTMLDivElement | null =
        document.querySelector("div#contents")
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
            ? document.querySelector<HTMLButtonElement>("button#nextButton") ??
              undefined
            : undefined

    await runProgramm(
        getDrawHandle(true),
        {
            name,
            content: array,
        },
        {
            action: "Run",
            arguments: { path: name, exitOnHalt: true },
        },
        manuallyStep
    )

    console.log("finished running the program")
}

start()

export interface PseudoFile {
    name: string
    content: Uint8ClampedArray
}
