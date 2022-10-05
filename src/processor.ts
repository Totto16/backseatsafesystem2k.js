import * as Word from "./builtins/Word"
import { STACK_START } from "./address_constants"
import { u32, u64 } from "./builtins/types"
import { Memory } from "./memory"
import * as Instruction from "./builtins/Instruction"
import { InstructionCache, CachedInstruction } from "./machine"
import { OpCode } from "./opcodes.generated"
import * as Byte from "./builtins/Byte"
import { KeyState } from "./keyboard"
import assert from "assert"

export const NUM_REGISTERS = 256
export class Registers {
    numRegisters: number
    registers: Register[];

    [key: number | Register]: Word.Word

    constructor(numRegisters: number) {
        this.numRegisters = numRegisters
        this.registers = new Array(numRegisters)
            .fill(undefined)
            .map((_, index) => {
                return new Register()
            })

        let self = this
        return new Proxy(this, {
            get(target, prop) {
                const index =
                    prop instanceof Register ? prop.index : Number(prop)
                if (!isNaN(index)) {
                    if (index >= 0 && index < self.numRegisters) {
                        return self.registers[index].value
                    } else {
                        throw new Error(`Indexing out of range: ${index}`)
                    }
                }
                return (target as { [key: string]: any })[prop as string]
            },
            set(target, prop, value) {
                const index =
                    prop instanceof Register ? prop.index : Number(prop)
                if (!isNaN(index)) {
                    if (index >= 0 && index < self.numRegisters) {
                        return (self.registers[index].value = value)
                    } else {
                        throw new Error(`Indexing out of range: ${index}`)
                    }
                }
                return (target as { [key: string]: any })[prop as string]
            },
        })
    }
}

export class Register {
    value: Word.Word
    index: number
    constructor(index: number, value = 0) {
        this.index = index
        this.value = value
    }

    static fromLetter(letter: string): Register {
        // TODO: stub for the moment
        return new Register(letter.charCodeAt(0) - "a".charCodeAt(0))
    }
}

export type FlagName = "Zero" | "Carry" | "DivideByZero"

export type FlagDescription = [FlagName, number]
export class Flag {
    name: FlagName
    bits: Word.Word
    shift: Word.Word

    static flags: FlagDescription[] = [
        ["Zero", 0],
        ["Carry", 1],
        ["DivideByZero", 2],
    ]

    constructor(name: FlagName) {
        this.name = name
        const [, shift] = Flag.flags.filter(([nm]) => nm === name)[0]
        this.bits = 0b1 << shift
        this.shift = shift
    }

    set(registerContent: Word.Word, setStatus: boolean): Word.Word {
        const modifiedContent: Word.Word =
            (registerContent & ~this.bits) | (setStatus << this.shift)
        return modifiedContent
    }
}

export enum Direction {
    Forwards,
    Backwards,
}

export enum ExecutionResult {
    Error,
    Normal,
    Halted,
}

export type PossibleTypes = "lt" | "le" | "eq" | "gt" | "ge"

export class CompResult {
    static Less = Word.MAX
    static Equal = 0
    static Greater = 1

    static compare(lhs: Word.Word, rhs: Word.Word): CompResult {
        return lhs < rhs
            ? CompResult.Less
            : lhs == rhs
            ? CompResult.Equal
            : CompResult.Greater
    }

    static isCorrect(input: Word.Word, type: PossibleTypes): boolean {
        let values: Word.Word[]
        switch (type) {
            case "lt":
                values = [CompResult.Less]
                break
            case "le":
                values = [CompResult.Less, CompResult.Equal]
                break
            case "eq":
                values = [CompResult.Equal]
                break
            case "gt":
                values = [CompResult.Greater]
                break
            case "ge":
                values = [CompResult.Greater, CompResult.Equal]
                break
            default:
                throw new Error(`unimplemented Compare Type: ${type}!`)
                break
        }

        assert(
            [CompResult.Less, CompResult.Equal, CompResult.Greater].includes(
                input
            )
        )
        return values.includes(input)
    }
}

export class Processor {
    registers: Registers
    cycleCount: u64
    exitOnHalt: boolean
    checkpointCounter: Word.Word

    FLAGS: Register = Register(NUM_REGISTERS - 3)
    INSTRUCTION_POINTER: Register = Register(NUM_REGISTERS - 2)
    STACK_POINTER: Register = Register(NUM_REGISTERS - 1)

    constructor(exitOnHalt: boolean) {
        this.registers = new Registers(NUM_REGISTERS)
        this.cycleCount = 0
        this.exitOnHalt = exitOnHalt
        this.checkpointCounter = 0
        this.registers[this.INSTRUCTION_POINTER] = ENTRY_POINT
        this.registers[this.STACK_POINTER] = STACK_START
    }

    getFlag(flagInput: Flag | FlagName): boolean {
        const flag =
            typeof flagInput === "string" ? new Flag(flagInput) : flagInput
        this.registers[this.FLAGS] & (flag.bits == flag.bits)
    }

    setFlag(flagInput: Flag | FlagName, set: boolean) {
        const flag =
            typeof flagInput === "string" ? new Flag(flagInput) : flagInput

        const bits: Word.Word = flag.set(this.registers[this.FLAGS], set)
        this.registers[this.FLAGS] = bits
    }

    getStackPointer(): Address {
        this.registers[this.STACK_POINTER]
    }

    setStackPointer(address: Address) {
        assert(address > STACK_START && address - STACK_START < STACK_SIZE)
        this.registers[this.STACK_POINTER] = address
    }

    advanceStackPointer(step: number, direction: Direction) {
        switch (direction) {
            case Direction.Forwards:
                this.setStackPointer(this.getStackPointer() + step)
                break

            case Direction.Backwards:
                this.setStackPointer(this.getStackPointer() - step)
                break
            default:
                throw new Error(`unimplemented Direction: ${direction}!`)
                break
        }
    }

    stackPush(memory: Memory, value: Word.Word) {
        memory.writeData(this.getStackPointer(), value)
        this.advanceStackPointer(Word.SIZE, Direction.Forwards)
    }

    stackPop(memory: Memory): Word.word {
        this.advanceStackPointer(Word.SIZE, Direction.Backwards)
        memory.readData(this.getStackPointer())
    }

    setInstructionPointer(address: Address) {
        this.registers[this.INSTRUCTION_POINTER] = address
    }

    getInstructionPointer(): Address {
        this.registers[this.INSTRUCTION_POINTER]
    }

    advanceInstructionPointer(direction: Direction) {
        switch (direction) {
            case Direction.Forwards:
                this.setInstructionPointer(
                    this.getInstructionPointer() + Instruction.SIZE
                )
                break

            case Direction.Backwards:
                this.setInstructionPointer(
                    Math.max(this.getInstructionPointer() - Instruction.SIZE, 0)
                )
                break
            default:
                throw new Error(`unimplemented Direction: ${direction}!`)
                break
        }
    }

    getCycleCount(): u64 {
        this.cycleCount
    }

    increaseCycleCount(amount: u64) {
        self.cycleCount += amount
    }

    executeNextInstruction<>(
        memory: Memory,
        periphery: Periphery,
        instructionCache: InstructionCache
    ): ExecutionResult {
        const instructionAddress = this.getInstructionPointer()
        const cacheIndex = (instructionAddress / Instruction.SIZE) as Address
        // TODO Instruction has to be made callable!!!!
        return instructionCache.cache[cacheIndex](this, memory, periphery)
    }

    pushInstructionPointer(memory: Memory) {
        this.stackPush(memory, this.getInstructionPointer() + Instruction.SIZE)
    }

    static generateCachedInstruction(opCode: OpCode): CachedInstruction {
        // unbound js function, the this is not the this referring the processor, it's meant to be like that!
        const handleCycleCountAndInstructionPointer = function (
            processor: Processor
        ) {
            processor.increaseCycleCount(opCode.getNumCycles())
            if (opCode.shouldIncrementInstructionPointer()) {
                processor.advanceInstructionPointer(Direction.Forwards)
            }
        }

        switch (opCode.name) {
            case "MoveRegisterImmediate": {
                const { register, immediate } = (
                    opCode as OpCode<"MoveRegisterImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[register] = immediate
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "MoveRegisterAddress": {
                const { register, source_address: address } = (
                    opCode as OpCode<"MoveRegisterAddress">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[register] = memory.readData(address)
                    handleCycleCountAndInstructionPointer(processor)
                    ExecutionResult.Normal
                }
            }

            case "MoveTargetSource": {
                const { target, source } = (
                    opCode as OpCode<"MoveTargetSource">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = processor.registers[source]
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveAddressRegister": {
                const { register, target_address: address } = (
                    opCode as OpCode<"MoveAddressRegister">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeData(address, processor.registers[register])
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveTargetPointer": {
                const { target, pointer } = (
                    opCode as OpCode<"MoveTargetPointer">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readData(
                        processor.registers[pointer]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MovePointerSource": {
                const { pointer, source } = (
                    opCode as OpCode<"MovePointerSource">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeData(
                        processor.registers[pointer],
                        processor.registers[source]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveByteRegisterAddress": {
                const { register, source_address } = (
                    opCode as OpCode<"MoveByteRegisterAddress">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[register] = memory.readByte(
                        source_address
                    ) as Word
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveByteAddressRegister": {
                const { register, target_address } = (
                    opCode as OpCode<"MoveByteAddressRegister">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeByte(
                        target_address,
                        processor.registers[register] as u8
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveByteTargetPointer": {
                const { target, pointer } = (
                    opCode as OpCode<"MoveByteTargetPointer">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readByte(
                        processor.registers[pointer]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveBytePointerSource": {
                const { pointer, source } = (
                    opCode as OpCode<"MoveBytePointerSource">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeByte(
                        processor.registers[pointer],
                        Byte.toByte(processor.registers[source])
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordRegisterAddress": {
                const { register, source_address } = (
                    opCode as OpCode<"MoveHalfwordRegisterAddress">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[register] =
                        memory.readHalfword(source_address)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordAddressRegister": {
                const { register, target_address } = (
                    opCode as OpCode<"MoveHalfwordAddressRegister">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeHalfword(
                        target_address,
                        HalfWord.toHalfWord(processor.registers[register])
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordTargetPointer": {
                const { target, pointer } = (
                    opCode as OpCode<"MoveHalfwordTargetPointer">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readHalfWord(
                        processor.registers[pointer]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordPointerSource": {
                const { pointer, source } = (
                    opCode as OpCode<"MoveHalfwordPointerSource">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeHalfWord(
                        processor.registers[pointer],
                        HalfWord.toHalfWord(processor.registers[source])
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MovePointerSourceOffset": {
                const { pointer, source, immediate } = (
                    opCode as OpCode<"MovePointerSourceOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeData(
                        processor.registers[pointer] + immediate,
                        processor.registers[source]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveBytePointerSourceOffset": {
                const { pointer, source, immediate } = (
                    opCode as OpCode<"MoveBytePointerSourceOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeByte(
                        processor.registers[pointer] + immediate,
                        Byte.toByte(processor.registers[source] as Byte)
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordPointerSourceOffset": {
                const { pointer, source, immediate } = (
                    opCode as OpCode<"MoveHalfwordPointerSourceOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    memory.writeHalfword(
                        processor.registers[pointer] + immediate,
                        HalfWord.toHalfWord(processor.registers[source])
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveTargetPointerOffset": {
                const { register, immediate } = (
                    opCode as OpCode<"MoveTargetPointerOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readData(
                        processor.registers[pointer] + immediate
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveByteTargetPointerOffset": {
                const { target, pointer, immediate } = (
                    opCode as OpCode<"MoveByteTargetPointerOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readByte(
                        processor.registers[pointer] + immediate
                    )

                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MoveHalfwordTargetPointerOffset": {
                const { target, pointer, immediate } = (
                    opCode as OpCode<"MoveHalfwordTargetPointerOffset">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] = memory.readHalfword(
                        processor.registers[pointer] + immediate
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "HaltAndCatchFire": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (processor.exitOnHalt) {
                        // TODO implement a "exit" in the browser, like a blank canvas, remove canvas or similar
                        throw new Error("exit(0)")
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Halted
                }
            }

            case "AddTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"AddTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingAdd(
                        lhs,
                        rhs,
                        processor
                    )
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "AddWithCarryTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"AddWithCarryTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingAdd(
                        lhs,
                        rhs,
                        processor,
                        true
                    )
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "SubtractTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"SubtractTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingSub(
                        lhs,
                        rhs,
                        processor
                    )
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "SubtractWithCarryTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"SubtractWithCarryTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingSub(
                        lhs,
                        rhs,
                        processor,
                        true
                    )
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "MultiplyHighLowLhsRhs": {
                const { high, low, lhs, rhs } = (
                    opCode as OpCode<"MultiplyHighLowLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingMul(
                        lhs,
                        rhs,
                        processor
                    )
                    const { upper, lower } = Instruction.asWords(result)
                    processor.registers[high] = upper
                    processor.registers[low] = lower
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "DivmodTargetModLhsRhs": {
                const { result, remainder, lhs, rhs } = (
                    opCode as OpCode<"DivmodTargetModLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]

                    if (rhs == 0) {
                        processor.registers[result] = 0
                        processor.registers[remainder] = lhs
                        processor.set_flag("Zero", true)
                        processor.set_flag("DivideByZero", true)
                    } else {
                        const [div, mod] = [Math.floor(lhs / rhs), lhs % rhs]

                        processor.registers[result] = div
                        processor.registers[remainder] = mod

                        processor.setFlag("Zero", div === 0)
                        processor.setFlag("DivideByZero", false)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "AndTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"AndTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs & rhs
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            case "OrTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"OrTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs | rhs
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "XorTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"XorTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs ^ rhs
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "NotTargetSource": {
                const { target, source } = (opCode as OpCode<"NotTargetSource">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const result = !processor.registers[target]
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "LeftShiftTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"LeftShiftTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingLeftShift(
                        lhs,
                        rhs,
                        processor
                    )

                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "RightShiftTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"RightShiftTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs: Word.Word = processor.registers[lhs]
                    const rhs: Word.Word = processor.registers[rhs]
                    const { result, didOverflow } = Word.overflowingRightShift(
                        lhs,
                        rhs,
                        processor
                    )

                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "AddTargetSourceImmediate": {
                const { target, source, immediate } = (
                    opCode as OpCode<"AddTargetSourceImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const { result, didOverflow } = Word.overflowingAdd(
                        processor.registers[source],
                        immediate,
                        processor,
                        true
                    )
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "SubtractTargetSourceImmediate": {
                const { target, source, immediate } = (
                    opCode as OpCode<"SubtractTargetSourceImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const { result, didOverflow } = Word.overflowingSub(
                        processor.registers[source],
                        immediate,
                        processor,
                        true
                    )
                    processor.registers[target] = result
                    return ExecutionResult.Normal
                }
            }
            case "CompareTargetLhsRhs": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"CompareTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = CompResult.compare(lhs, rhs)
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "PushRegister": {
                const { register } = (opCode as OpCode<"PushRegister">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.stackPush(memory, processor.registers[register])
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "PushImmediate": {
                const { immediate } = (opCode as OpCode<"PushImmediate">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.stackPush(memory, immediate)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "PopRegister": {
                const { register } = (opCode as OpCode<"PopRegister">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[register] = processor.stackPop(memory)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "Pop": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.stackPop(memory)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "CallAddress": {
                const { source_address: address } = (
                    opCode as OpCode<"CallAddress">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.pushInstructionPointer(memory)
                    processor.setInstructionPointer(address)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "Return": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const returnAddress = processor.stackPop(memory)
                    processor.setInstructionPointer(returnAddress)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediate": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.setInstructionPointer(address)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegister": {
                const { register } = (opCode as OpCode<"JumpRegister">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.setInstructionPointer(
                        processor.registers[register]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfEqual": {
                const { comparison, immediate: address } = (
                    opCode as OpCode<"AndTargetLhsRhs">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "eq"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfGreaterThan": {
                const { comparison, immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfGreaterThan">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "gt"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfLessThan": {
                const { comparison, immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfLessThan">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "lt"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfGreaterThanOrEqual": {
                const { comparison, immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfGreaterThanOrEqual">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "ge"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfLessThanOrEqual": {
                const { comparison, immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfLessThanOrEqual">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "le"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfZero": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (processor.getFlag("Zero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfNotZero": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfNotZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (!processor.getFlag("Zero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfCarry": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfCarry">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (!processor.getFlag("Carry")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfNotCarry": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfNotCarry">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (!processor.getFlag("Carry")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfDivideByZero": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfDivideByZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (!processor.getFlag("DivideByZero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpImmediateIfNotDivideByZero": {
                const { immediate: address } = (
                    opCode as OpCode<"JumpImmediateIfNotDivideByZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (!processor.getFlag("DivideByZero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfEqual": {
                const { pointer, comparison } = (
                    opCode as OpCode<"JumpRegisterIfEqual">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "eq"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfGreaterThan": {
                const { pointer, comparison } = (
                    opCode as OpCode<"JumpRegisterIfGreaterThan">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "gt"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfLessThan": {
                const { pointer, comparison } = (
                    opCode as OpCode<"JumpRegisterIfLessThan">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "lt"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfGreaterThanOrEqual": {
                const { pointer, comparison } = (
                    opCode as OpCode<"JumpRegisterIfGreaterThanOrEqual">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "ge"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfLessThanOrEqual": {
                const { pointer, comparison } = (
                    opCode as OpCode<"JumpRegisterIfLessThanOrEqual">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (
                        CompResult.isCorrect(
                            processor.registers[comparison],
                            "le"
                        )
                    ) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfZero": {
                const { pointer } = (opCode as OpCode<"JumpRegisterIfZero">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (processor.getFlag("Zero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfNotZero": {
                const { pointer } = (opCode as OpCode<"JumpRegisterIfNotZero">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (!processor.getFlag("Zero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfCarry": {
                const { pointer } = (opCode as OpCode<"JumpRegisterIfCarry">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (processor.getFlag("Carry")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfNotCarry": {
                const { pointer } = (opCode as OpCode<"JumpRegisterIfNotCarry">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (!processor.getFlag("Carry")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfDivideByZero": {
                const { pointer } = (
                    opCode as OpCode<"JumpRegisterIfDivideByZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (processor.getFlag("DivideByZero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "JumpRegisterIfNotDivideByZero": {
                const { pointer } = (
                    opCode as OpCode<"JumpRegisterIfNotDivideByZero">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = processor.registers[pointer]
                    if (!processor.getFlag("DivideByZero")) {
                        processor.setInstructionPointer(address)
                    } else {
                        processor.advanceInstructionPointer(Direction.Forwards)
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "NoOp": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "GetKeyState": {
                const { target, keycode } = (opCode as OpCode<"GetKeyState">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const result =
                        periphery.keyboard.getKeyState(
                            processor.registers[keycode]
                        ) == KeyState.Down
                    processor.registers[target] = result
                    processor.setFlag("Zero", result === 0)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "PollTime": {
                const { high, low } = (opCode as OpCode<"PollTime">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const time = periphery.timer.getMsSinceEpoch()
                    const [upper, lower] = Instruction.asWords(time)
                    processor.registers[low] = upper
                    processor.registers[high] = lower
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "CallRegister": {
                const { register } = (opCode as OpCode<"CallRegister">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.pushInstructionPointer(memory)
                    processor.setInstructionPointer(
                        processor.registers[register]
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "CallPointer": {
                const { pointer } = (opCode as OpCode<"CallPointer">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const address = memory.readData(
                        processor.registers[pointer]
                    )
                    processor.pushInstructionPointer(memory)
                    processor.setInstructionPointer(address)
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "SwapFramebuffers": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    periphery.display.swap()
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "InvisibleFramebufferAddress": {
                const { target } = (
                    opCode as OpCode<"InvisibleFramebufferAddress">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers[target] =
                        periphery.display.InvisibleFramebufferAddress()
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "PollCycleCountHighLow": {
                const { high, low } = (
                    opCode as OpCode<"PollCycleCountHighLow">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const cycles = processor.cycleCount
                    const [upper, lower] = Instruction.asWords(cycles)
                    processor.registers[low] = upper
                    processor.registers[high] = lower
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            // TODO here also make this visible, by default, also make an event, that is executed when a register / memory byte changes (only available in slow or step mode!!
            case "DumpRegisters": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    processor.registers.registers.forEach((word, index) => {
                        const bytes = Word.toBEBytes(word)
                        console.debug(
                            `Register r${index} = ${bytes
                                .map((byte) => Word.toHexString([byte]))
                                .join(" ")}`
                        )
                    })
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "DumpMemory": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    console.debug(
                        ` ---- Memory - SIZE ${Memory.SIZE} Bytes ---- `
                    )
                    const stepSize = 16
                    for (const i = 0; i < Memory.SIZE; i += stepSize) {
                        const data = memory.data.slice(i, i + stepSize)
                        const bytes = Instruction.toBEBytes(BigInt(i))
                        console.debug(
                            `${Byte.toHexString(bytes)} : ${data
                                .map((byte) => `0x${Byte.toHexString(byte)}`)
                                .join(" ")}`
                        )
                    }
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "AssertRegisterRegister": {
                const { expected, actual } = (
                    opCode as OpCode<"AssertRegisterRegister">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    assert(
                        processor.registers[actual] ===
                            processor.registers[expected],
                        "opCode: AssertRegisterRegister"
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "AssertRegisterImmediate": {
                const { actual, immediate } = (
                    opCode as OpCode<"AssertRegisterImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    assert(
                        processor.registers[actual] === immediate,
                        "opCode: AssertRegisterImmediate"
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "AssertPointerImmediate": {
                const { pointer, immediate } = (
                    opCode as OpCode<"AssertPointerImmediate">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    assert(
                        memory.readData(processor.registers[pointer]) ===
                            immediate,
                        "opCode: AssertPointerImmediate"
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "DebugBreak": {
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    throw new Error("panic")
                }
            }
            case "PrintRegister": {
                const { register } = (opCode as OpCode<"PrintRegister">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const bytes = Word.toBEBytes(processor.registers[register])
                    console.debug(
                        `Register r${index} = ${bytes
                            .map((byte) => Word.toHexString([byte]))
                            .join(" ")}`
                    )
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareEquals": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareEquals">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    assert(Byte.isBool(lhs) && Byte.isBool(rhs))
                    const result = lhs === rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareNotEquals": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareNotEquals">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs !== rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareGreater": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareGreater">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs > rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareGreaterOrEquals": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareGreaterOrEquals">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs >= rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareLess": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareLess">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs < rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "BoolCompareLessOrEquals": {
                const { target, lhs, rhs } = (
                    opCode as OpCode<"BoolCompareLessOrEquals">
                ).parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    const lhs = processor.registers[lhs]
                    const rhs = processor.registers[rhs]
                    const result = lhs <= rhs
                    processor.registers[target] = result
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }
            case "Checkpoint": {
                const { immediate } = (opCode as OpCode<"Checkpoint">)
                    .parsedInstruction
                return function (
                    processor: Processor,
                    memory: Memory,
                    periphery: Periphery
                ): ExecutionResult {
                    if (immediate != processor.checkpoint_counter) {
                        assert(
                            false,
                            `checkpoint counter mismatch: expected ${processor.checkpointCounter}, got ${immediate}`
                        )
                    }
                    processor.checkpointCounter += 1
                    handleCycleCountAndInstructionPointer(processor)
                    return ExecutionResult.Normal
                }
            }

            default:
                throw new Error(`unimplemented operation Code: ${opCode.name}!`)
        }
    }
}
