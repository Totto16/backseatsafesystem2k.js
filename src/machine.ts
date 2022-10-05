import * as Instruction from "./builtins/Instruction"
import { CursorMode } from "./cursor"
import { Memory } from "./memory"
import { Periphery } from "./periphery"
import { ExecutionResult, Processor } from "./processor"
import { TERMINAL_CURSOR_MODE, ENTRY_POINT } from "./address_constants"
import { Cursor } from "./cursor"
import { DrawHandle, render as terminalRender } from "./terminal"

export type CachedInstruction = (
    processor: Processor,
    memory: Memory,
    periphery: Periphery
) => ExecutionResult

export interface InstructionCache {
    cache: Array<undefined | CachedInstruction>
}

export class Machine {
    memory: Memory
    processor: Processor
    periphery: Periphery
    isHalted: boolean
    instructionCache: InstructionCache

    constructor(periphery: Periphery, exitOnHalt: boolean) {
        const MAX_NUM_INSTRUCTIONS: number = Memory.SIZE / Instruction.SIZE
        const cache: undefined[] = new Array(MAX_NUM_INSTRUCTIONS).fill(
            undefined
        )

        this.memory = new Memory()
        this.processor = new Processor(exitOnHalt)
        this.periphery = periphery
        this.isHalted = false
        this.instructionCache = {
            cache,
        }
    }

    generateInstructionCache() {
        const MAX_NUM_INSTRUCTIONS: number = Memory.SIZE / Instruction.SIZE
        const cache = new Array(MAX_NUM_INSTRUCTIONS)
            .fill(undefined)
            .map((previous, i) => {
                const address = i * Instruction.SIZE
                if (address >= ENTRY_POINT) {
                    const opCode=
                        this.memory.readOpcode(address)
                    return Processor.generateCachedInstruction(opCode)
                }
                return previous
            })

        this.instructionCache.cache = cache
    }

    updateCursor() {
        const cursorModeFlag = this.memory.readData(
            TERMINAL_CURSOR_MODE
        ) as CursorMode

        switch (cursorModeFlag) {
            case CursorMode.Blinking:
                if (
                    new Date().getTime() >=
                    this.periphery.cursor.timeOfNextToggle
                ) {
                    this.periphery.cursor.visible =
                        !this.periphery.cursor.visible
                    this.periphery.cursor.timeOfNextToggle +=
                        Cursor.TOGGLE_INTERVAL
                }
                break
            case CursorMode.Visible:
                this.periphery.cursor.visible = true
                break

            case CursorMode.Invisible:
                this.periphery.cursor.visible = false
                break

            default:
                throw new Error(`unimplemented CursorMode: ${cursorModeFlag}!`)
                break
        }
    }

    render(drawHandle: DrawHandle) {
        this.periphery.display.render(this.memory, drawHandle)
        this.updateCursor()
        terminalRender(
            this.memory,
            drawHandle,
            [0, 0],
            this.periphery.display.font,
            { height: 20.0, size: 18.0 },
            this.periphery.cursor,
            this.periphery.display
        )
    }

    executeNextInstruction() {
        const state: ExecutionResult = this.processor.executeNextInstruction(
            this.memory,
            this.periphery,
            this.instructionCache
        )

        switch (state) {
            case ExecutionResult.Error:
                throw new Error("PANIC")
            case ExecutionResult.Normal:
                break
            case ExecutionResult.Halted:
                this.isHalted = true
                break
            default:
                throw new Error(`unimplemented ExecutionResult: ${state}!`)
        }
    }
}
