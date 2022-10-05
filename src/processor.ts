import * as Word from "./builtins/Word"
import { STACK_START } from "./address_constants"
import { u32, u64 } from "./builtins/types"
import { Memory } from "./memory"
import * as Instruction from "./builtins/Instruction"
import { InstructionCache, CachedInstruction } from "./machine"
import { OpCode } from "./opcodes.generated"
import * as Byte from "./builtins/Byte"

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
                    prop instanceof Register ? prop.value : Number(prop)
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
                    prop instanceof Register ? prop.value : Number(prop)
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
    constructor(value = 0) {
        this.value = value
    }

    static fromLetter(letter: string): Register {
        // TODO: stub for the moment
        return new Register()
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
        console.assert(
            address > STACK_START && address - STACK_START < STACK_SIZE
        )
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

            /* 
            OrTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    processor.registers[target] = lhs | rhs;
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            XorTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    processor.registers[target] = lhs ^ rhs;
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            NotTargetSource { target, source } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = !processor.registers[source];
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            LeftShiftTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    if rhs > Word::BITS {
                        processor.registers[target] = 0;
                        processor.set_flag(Flag::Zero, true);
                        processor.set_flag(Flag::Carry, lhs > 0);
                    } else {
                        let result = lhs << rhs;
                        processor.registers[target] = result;
                        processor.set_flag(Flag::Zero, result == 0);
                        processor.set_flag(Flag::Carry, rhs > lhs.leading_zeros());
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            RightShiftTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    if rhs > Word::BITS {
                        processor.registers[target] = 0;
                        processor.set_flag(Flag::Zero, true);
                        processor.set_flag(Flag::Carry, lhs > 0);
                    } else {
                        let result = lhs >> rhs;
                        processor.registers[target] = result;
                        processor.set_flag(Flag::Zero, result == 0);
                        processor.set_flag(Flag::Carry, rhs > lhs.trailing_zeros());
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            AddTargetSourceImmediate {
                target,
                source,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let carry;
                    (processor.registers[target], carry) =
                        processor.registers[source].overflowing_add(immediate);
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(Flag::Carry, carry);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            SubtractTargetSourceImmediate {
                target,
                source,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        processor.registers[source].wrapping_sub(immediate);
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(Flag::Carry, immediate > processor.registers[source]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            CompareTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    processor.registers[target] = match lhs.cmp(&rhs) {
                        std::cmp::Ordering::Less => Word::MAX,
                        std::cmp::Ordering::Equal => 0,
                        std::cmp::Ordering::Greater => 1,
                    };
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            PushRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_push(memory, processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            PushImmediate { immediate } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_push(memory, immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            PopRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = processor.stack_pop(memory);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            Pop {} => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_pop(memory);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            CallAddress {
                source_address: address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.push_instruction_pointer(memory);
                    processor.set_instruction_pointer(address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            Return {} => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let return_address = processor.stack_pop(memory);
                    processor.set_instruction_pointer(return_address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediate { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.set_instruction_pointer(address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegister { register } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.set_instruction_pointer(processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfEqual {
                comparison,
                immediate: address,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        0 => processor.set_instruction_pointer(address),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfGreaterThan {
                comparison,
                immediate: address,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        1 => processor.set_instruction_pointer(address),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfLessThan {
                comparison,
                immediate: address,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        Word::MAX => processor.set_instruction_pointer(address),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfGreaterThanOrEqual {
                comparison,
                immediate: address,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        1 | 0 => processor.set_instruction_pointer(address),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfLessThanOrEqual {
                comparison,
                immediate: address,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        Word::MAX | 0 => processor.set_instruction_pointer(address),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfZero { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Zero) {
                        true => processor.set_instruction_pointer(address),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfNotZero { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Zero) {
                        false => processor.set_instruction_pointer(address),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfCarry { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Carry) {
                        true => processor.set_instruction_pointer(address),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfNotCarry { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Carry) {
                        false => processor.set_instruction_pointer(address),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfDivideByZero { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::DivideByZero) {
                        true => processor.set_instruction_pointer(address),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpImmediateIfNotDivideByZero { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::DivideByZero) {
                        false => processor.set_instruction_pointer(address),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfEqual {
                pointer,
                comparison,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        0 => processor.set_instruction_pointer(processor.registers[pointer]),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfGreaterThan {
                pointer,
                comparison,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        1 => processor.set_instruction_pointer(processor.registers[pointer]),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfLessThan {
                pointer,
                comparison,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        Word::MAX => {
                            processor.set_instruction_pointer(processor.registers[pointer])
                        }
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfGreaterThanOrEqual {
                pointer,
                comparison,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        1 | 0 => processor.set_instruction_pointer(processor.registers[pointer]),
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfLessThanOrEqual {
                pointer,
                comparison,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.registers[comparison] {
                        Word::MAX | 0 => {
                            processor.set_instruction_pointer(processor.registers[pointer])
                        }
                        _ => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfZero { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Zero) {
                        true => processor.set_instruction_pointer(processor.registers[pointer]),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfNotZero { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Zero) {
                        false => processor.set_instruction_pointer(processor.registers[pointer]),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfCarry { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Carry) {
                        true => processor.set_instruction_pointer(processor.registers[pointer]),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfNotCarry { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::Carry) {
                        false => processor.set_instruction_pointer(processor.registers[pointer]),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfDivideByZero { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::DivideByZero) {
                        true => processor.set_instruction_pointer(processor.registers[pointer]),
                        false => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegisterIfNotDivideByZero { pointer } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    match processor.get_flag(Flag::DivideByZero) {
                        false => processor.set_instruction_pointer(processor.registers[pointer]),
                        true => processor.advance_instruction_pointer(Direction::Forwards),
                    };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            NoOp {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            GetKeyState { target, keycode } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = matches!(
                        periphery
                            .keyboard()
                            .get_keystate(processor.registers[keycode] as _),
                        KeyState::Down
                    )
                    .into();
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            PollTime { high, low } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    let time = periphery.timer().get_ms_since_epoch();
                    processor.registers[low] = time as Word;
                    processor.registers[high] = (time >> Word::BITS) as Word;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
           
            CallRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.push_instruction_pointer(memory);
                    processor.set_instruction_pointer(processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            CallPointer { pointer } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.push_instruction_pointer(memory);
                    processor
                        .set_instruction_pointer(memory.read_data(processor.registers[pointer]));
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            SwapFramebuffers {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    periphery.display().swap();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            InvisibleFramebufferAddress { target } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        periphery.display().invisible_framebuffer_address();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            PollCycleCountHighLow { high, low } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[low] = processor.cycle_count as Word;
                    processor.registers[high] = (processor.cycle_count >> Word::BITS) as Word;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            DumpRegisters {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let data: Vec<_> = processor
                        .registers
                        .0
                        .iter()
                        .flat_map(|word| word.to_be_bytes())
                        .collect();
                    if let Err(error) = dumper::dump("registers", &data) {
                        eprintln!("Error dumping registers: {}", error);
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            DumpMemory {} => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    if let Err(error) = dumper::dump("memory", memory.data()) {
                        eprintln!("Error dumping memory: {}", error);
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            AssertRegisterRegister { expected, actual } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(processor.registers[actual], processor.registers[expected]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            AssertRegisterImmediate { actual, immediate } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(processor.registers[actual], immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            AssertPointerImmediate { pointer, immediate } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(memory.read_data(processor.registers[pointer]), immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            DebugBreak {} => Box::new(
                move |_processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery|
                      -> ExecutionResult {
                    panic!();
                },
            ) as CachedInstruction<ConcretePeriphery>,
            PrintRegister { register } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    eprintln!(
                        "value of register {:#x}: {:#x} ({})",
                        register.0, processor.registers[register], processor.registers[register]
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            BoolCompareEquals { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] == processor.registers[rhs] {
                            1
                        } else {
                            0
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            BoolCompareNotEquals { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] == processor.registers[rhs] {
                            0
                        } else {
                            1
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            BoolCompareGreater { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] > processor.registers[rhs] {
                            1
                        } else {
                            0
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            BoolCompareGreaterOrEquals { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] >= processor.registers[rhs] {
                            1
                        } else {
                            0
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            BoolCompareLess { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] < processor.registers[rhs] {
                            1
                        } else {
                            0
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            BoolCompareLessOrEquals { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        if processor.registers[lhs] <= processor.registers[rhs] {
                            1
                        } else {
                            0
                        };
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            Checkpoint { immediate } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    if immediate != processor.checkpoint_counter {
                        panic!(
                            "checkpoint counter mismatch: expected {}, got {}",
                            processor.checkpoint_counter, immediate
                        );
                    }
                    processor.checkpoint_counter += 1;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult.Normal
                },
            ) as CachedInstruction<ConcretePeriphery>, */

            default:
                throw new Error(`unimplemented operation Code: ${opCode.name}!`)
        }
    }
}
