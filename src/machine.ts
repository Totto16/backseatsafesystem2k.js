import * as Instruction from "./builtins/Instruction"
import { CursorMode } from "./cursor"
import { Memory } from "./memory"
import { Periphery } from "./periphery"
import { ExecutionResult, Processor } from "./processor"
import { TERMINAL_CURSOR_MODE, ENTRY_POINT } from "./address_constants"
import { Cursor } from "./cursor"
import { DrawHandle, render as terminalRender } from "./terminal"
import { assert } from "./builtins/utils"

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

    static MAX_NUM_INSTRUCTIONS = Memory.SIZE / Instruction.SIZE

    constructor(periphery: Periphery, exitOnHalt: boolean) {
        const cache: undefined[] = new Array(Machine.MAX_NUM_INSTRUCTIONS).fill(
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

    // Attention, Size and start is in bytes, so multiply by Instruction.SIZE if necessary
    generateInstructionCache(start?: number, size?: number) {
        const genrateSize =
            size !== undefined
                ? size / Instruction.SIZE
                : Machine.MAX_NUM_INSTRUCTIONS
        const generateStart = start !== undefined ? start / Instruction.SIZE : 0

        if (size) {
            assert(
                size % Instruction.SIZE,
                0,
                `The size must be a multiple of Instruction.SIZE: ${Instruction.SIZE}`
            )
        }
        if (start) {
            assert(
                start % Instruction.SIZE,
                0,
                `The start must be a multiple of Instruction.SIZE: ${Instruction.SIZE}`
            )
        }

        new Array(genrateSize).fill(undefined).forEach((previous, _i) => {
            const index = generateStart + _i
            const address = index * Instruction.SIZE
            if (address >= ENTRY_POINT) {
                const opCode = this.memory.readOpcode(address)
                this.instructionCache.cache[index] =
                    Processor.generateCachedInstruction(opCode)
            } else {
                throw new Error(
                    "Address below entry point, please use the start Parameter!"
                )
            }
        })
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
            this
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
