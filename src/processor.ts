import * as Word from "./builtins/Word"
import { STACK_START } from "./address_constants";
import { u32, u64 } from "./builtins/types";
import { Memory } from "./memory";
import * as Instruction from "./builtins/Instruction"
import { InstructionCache, CachedInstruction} from "./machine";
import {OpCode} from "./opcodes.generated"


export const NUM_REGISTERS = 256
export class Registers {
    numRegisters: number
    registers: Register[];

    [key: number | Register]: Word.Word;

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
                const index = prop instanceof Register ? prop.value : Number(prop)
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
                const index = prop instanceof Register ? prop.value : Number(prop)
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
    value: Word.Word;
    constructor(value = 0) {
        this.value = value
    }

    static fromLetter(letter : string) : Register{
        // TODO: stub for the moment
        return new Register();
    }
}


export type FlagName = "Zero" | "Carry" | "DivideByZero";


export type FlagDescription = [FlagName, number]
export class Flag{
    name : FlagName;
    bits: Word.Word;
    shift : Word.Word

    static flags : FlagDescription[] = [
        ["Zero", 0],
        ["Carry", 1],
        ["DivideByZero", 2]
    ]

    constructor(name : FlagName){
        this.name = name;
        const [,shift] = Flag.flags.filter(([nm])=>nm === name)[0];
        this.bits = 0b1 << shift;
        this.shift = shift;
    }

    set(registerContent : Word.Word, setStatus : boolean): Word.Word{
        const  modifiedContent : Word.Word = (registerContent & ~(this.bits) | (setStatus << this.shift))
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

    FLAGS : Register = Register(NUM_REGISTERS -3)
    INSTRUCTION_POINTER: Register = Register((NUM_REGISTERS - 2));
    STACK_POINTER: Register = Register((NUM_REGISTERS - 1));

    constructor(exitOnHalt: boolean) {
        this.registers = new Registers(NUM_REGISTERS)
        this.cycleCount = 0
        this.exitOnHalt = exitOnHalt
        this.checkpointCounter = 0
        this.registers[this.INSTRUCTION_POINTER] = ENTRY_POINT
        this.registers[this.STACK_POINTER] = STACK_START
    }


    getFlag(flagInput: Flag | FlagName) :boolean {
        const flag = typeof flagInput === "string" ? new Flag(flagInput) : flagInput;
        this.registers[this.FLAGS] & flag.bits == flag.bits
    }

    setFlag(flagInput: Flag | FlagName, set: boolean) {
        const flag = typeof flagInput === "string" ? new Flag(flagInput) : flagInput;

        const bits : Word.Word = flag.set(this.registers[this.FLAGS], set);
        this.registers[this.FLAGS] = bits;
    }

    getStackPointer() : Address {
        this.registers[this.STACK_POINTER]
    }

    setStackPointer(address: Address) {
        console.assert((address > STACK_START && address - STACK_START < STACK_SIZE));
        this.registers[this.STACK_POINTER] = address;
    }

    advanceStackPointer( step: number, direction: Direction) {
        switch (direction) {
            case Direction.Forwards:
                this.setStackPointer(this.getStackPointer() + step)
                break;
        
                case Direction.Backwards:
                    this.setStackPointer(this.getStackPointer() - step)
                    break;
            default:
                throw new Error(`unimplemented Direction: ${direction}!`)
                break;
        }
    }

    stackPush(memory: Memory, value: Word.Word) {
        memory.writeData(this.getStackPointer(), value);
        this.advanceStackPointer(Word.SIZE, Direction.Forwards);
    }

    stackPop(memory : Memory) : Word.word {
        this.advanceStackPointer(Word.SIZE, Direction.Backwards);
        memory.readData(this.getStackPointer())
    }

    setInstructionPointer(address: Address) {
        this.registers[this.INSTRUCTION_POINTER] = address;
    }

    getInstructionPointer(): Address {
        this.registers[this.INSTRUCTION_POINTER]
    }

    advanceInstructionPointer(direction: Direction) {

        switch (direction) {
            case Direction.Forwards:
                this.setInstructionPointer(this.getInstructionPointer() + Instruction.SIZE)
                break;
        
                case Direction.Backwards:
                    this.setInstructionPointer(Math.max(this.getInstructionPointer() - Instruction.SIZE,0))
                    break;
            default:
                throw new Error(`unimplemented Direction: ${direction}!`)
                break;
        }

    }

    getCycleCount() : u64 {
        this.cycleCount
    }

    increaseCycleCount(amount: u64) {
        self.cycleCount += amount;
    }


    executeNextInstruction<>(
        memory: Memory,
        periphery: Periphery,
        instructionCache:InstructionCache,
    ) : ExecutionResult {
        const instructionAddress = this.getInstructionPointer();
        const cacheIndex = instructionAddress / Instruction.SIZE as Address;
        // TODO Instruction has to be made callable!!!!
        return instructionCache.cache[cacheIndex](this, memory, periphery)
    }

    pushInstructionPointer(memory: Memory) {
        this.stackPush(
            memory,
            this.getInstructionPointer() + Instruction.SIZE,
        );
    }


    static generateCachedInstruction(
        opcode: OpCode,
    ) : CachedInstruction {

        // unbound js function, the this is not the this referring the processor, it's meant to be like that!
        const handleCycleCountAndInstructionPointer = function (processor: Processor){
            processor.increaseCycleCount(opcode.get_num_cycles());
            if (opcode.should_increment_instruction_pointer()) {
                processor.advanceInstructionPointer(Direction.Forwards);
            }
        };

       switch(opcode) {
            MoveRegisterImmediate {
                register,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = immediate;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveRegisterAddress {
                register,
                source_address: address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = memory.read_data(address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveTargetSource { target, source } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = processor.registers[source];
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MoveAddressRegister {
                register,
                target_address: address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_data(address, processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveTargetPointer { target, pointer } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = memory.read_data(processor.registers[pointer]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MovePointerSource { pointer, source } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_data(processor.registers[pointer], processor.registers[source]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MoveByteRegisterAddress {
                register,
                source_address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = memory.read_byte(source_address) as Word;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveByteAddressRegister {
                register,
                target_address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_byte(target_address, processor.registers[register] as u8);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveByteTargetPointer { target, pointer } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        memory.read_byte(processor.registers[pointer]) as Word;
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MoveBytePointerSource { pointer, source } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_byte(
                        processor.registers[pointer],
                        processor.registers[source] as u8,
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordRegisterAddress {
                register,
                source_address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = memory.read_halfword(source_address).into();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordAddressRegister {
                register,
                target_address,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_halfword(target_address, processor.registers[register] as u16);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordTargetPointer { target, pointer } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        memory.read_halfword(processor.registers[pointer]).into();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordPointerSource { pointer, source } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_halfword(
                        processor.registers[pointer],
                        processor.registers[source] as u16,
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MovePointerSourceOffset {
                pointer,
                source,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_data(
                        processor.registers[pointer] + immediate,
                        processor.registers[source],
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveBytePointerSourceOffset {
                pointer,
                source,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_byte(
                        processor.registers[pointer] + immediate,
                        processor.registers[source] as Byte,
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordPointerSourceOffset {
                pointer,
                source,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    memory.write_halfword(
                        processor.registers[pointer] + immediate,
                        processor.registers[source] as Halfword,
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveTargetPointerOffset {
                target,
                pointer,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        memory.read_data(processor.registers[pointer] + immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveByteTargetPointerOffset {
                target,
                pointer,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = memory
                        .read_byte(processor.registers[pointer] + immediate)
                        .into();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            MoveHalfwordTargetPointerOffset {
                target,
                pointer,
                immediate,
            } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[target] = memory
                        .read_halfword(processor.registers[pointer] + immediate)
                        .into();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            HaltAndCatchFire {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    println!("HALT AND CATCH FIRE!");
                    if processor.exit_on_halt {
                        std::process::exit(0);
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Halted
                },
            ) as CachedInstruction<ConcretePeriphery>,
            AddTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    let did_overflow;
                    (processor.registers[target], did_overflow) = lhs.overflowing_add(rhs);
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(Flag::Carry, did_overflow);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            SubtractTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    let did_overflow;
                    (processor.registers[target], did_overflow) = lhs.overflowing_sub(rhs);
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(Flag::Carry, did_overflow);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            SubtractWithCarryTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    let carry_flag_set = processor.get_flag(Flag::Carry);
                    let did_overflow;
                    (processor.registers[target], did_overflow) = lhs.overflowing_sub(rhs);
                    let did_overflow_after_subtracting_carry;
                    (
                        processor.registers[target],
                        did_overflow_after_subtracting_carry,
                    ) = processor.registers[target].overflowing_sub(carry_flag_set as _);
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(
                        Flag::Carry,
                        did_overflow || did_overflow_after_subtracting_carry,
                    );
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            MultiplyHighLowLhsRhs {
                high,
                low,
                lhs,
                rhs,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    let result = lhs as u64 * rhs as u64;
                    processor.registers[high] = (result >> 32) as u32;
                    processor.registers[low] = result as u32;
                    processor.set_flag(Flag::Zero, processor.registers[low] == 0);
                    processor.set_flag(Flag::Carry, processor.registers[high] > 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            DivmodTargetModLhsRhs {
                result,
                remainder,
                lhs,
                rhs,
            } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    if rhs == 0 {
                        processor.registers[result] = 0;
                        processor.registers[remainder] = lhs;
                        processor.set_flag(Flag::Zero, true);
                        processor.set_flag(Flag::DivideByZero, true);
                    } else {
                        (processor.registers[result], processor.registers[remainder]) =
                            (lhs / rhs, lhs % rhs);
                        processor.set_flag(Flag::Zero, processor.registers[result] == 0);
                        processor.set_flag(Flag::DivideByZero, false);
                    }
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            AndTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    processor.registers[target] = lhs & rhs;
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            OrTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let lhs = processor.registers[lhs];
                    let rhs = processor.registers[rhs];
                    processor.registers[target] = lhs | rhs;
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            PushRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_push(memory, processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            PushImmediate { immediate } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_push(memory, immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            PopRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.registers[register] = processor.stack_pop(memory);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            Pop {} => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.stack_pop(memory);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            Return {} => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let return_address = processor.stack_pop(memory);
                    processor.set_instruction_pointer(return_address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            JumpImmediate { immediate: address } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.set_instruction_pointer(address);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            JumpRegister { register } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.set_instruction_pointer(processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            NoOp {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            AddWithCarryTargetLhsRhs { target, lhs, rhs } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    let result = processor.registers[lhs]
                        .wrapping_add(processor.registers[rhs])
                        .wrapping_add(processor.get_flag(Flag::Carry).into());
                    let overflow_happened = (processor.registers[lhs] as u64
                        + processor.registers[rhs] as u64
                        + processor.get_flag(Flag::Carry) as u64)
                        > Word::MAX as u64;
                    processor.registers[target] = result;
                    processor.set_flag(Flag::Zero, processor.registers[target] == 0);
                    processor.set_flag(Flag::Carry, overflow_happened);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            CallRegister { register } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    processor.push_instruction_pointer(memory);
                    processor.set_instruction_pointer(processor.registers[register]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            SwapFramebuffers {} => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    periphery.display().swap();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            InvisibleFramebufferAddress { target } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      periphery: &mut ConcretePeriphery| {
                    processor.registers[target] =
                        periphery.display().invisible_framebuffer_address();
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
            AssertRegisterRegister { expected, actual } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(processor.registers[actual], processor.registers[expected]);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            AssertRegisterImmediate { actual, immediate } => Box::new(
                move |processor: &mut Processor,
                      _memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(processor.registers[actual], immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
                },
            )
                as CachedInstruction<ConcretePeriphery>,
            AssertPointerImmediate { pointer, immediate } => Box::new(
                move |processor: &mut Processor,
                      memory: &mut Memory,
                      _periphery: &mut ConcretePeriphery| {
                    assert_eq!(memory.read_data(processor.registers[pointer]), immediate);
                    handleCycleCountAndInstructionPointer(processor);
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
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
                    ExecutionResult::Normal
                },
            ) as CachedInstruction<ConcretePeriphery>,
        }
    }

}
