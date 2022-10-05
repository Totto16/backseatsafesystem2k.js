import {
    Parser,
    choice,
    char,
    sepBy,
    regex,
    optionalWhitespace,
    str,
    possibly,
    succeedWith,
    letters,
    digits,
} from "arcsecond"
import { writeFileSync, readFileSync } from "fs"
import { join } from "path"
import { exit } from "process"
import * as HalfWord from "../src/builtins/HalfWord"

const opcodes = `    // move instructions
    { MoveRegisterImmediate, 0x0000, registers(Target R register), immediate; cycles = 1, Increment::Yes, "move the value C into register R" },
    { MoveRegisterAddress, 0x0001, registers(Target R register), source_address; cycles = 1, Increment::Yes, "move the value at address A into register R" },
    { MoveTargetSource, 0x0002, registers(Target T target, Source S source); cycles = 1, Increment::Yes, "move the contents of register S into register T" },
    { MoveAddressRegister, 0x0003, registers(Source R register), target_address; cycles = 1, Increment::Yes, "move the contents of register R into memory at address A" },
    { MoveTargetPointer, 0x0004, registers(Target T target, Source P pointer); cycles = 1, Increment::Yes, "move the contents addressed by the value of register P into register T" },
    { MovePointerSource, 0x0005, registers(Target P pointer, Source S source); cycles = 1, Increment::Yes, "move the contents of register S into memory at address specified by register P" },
    // move instructions for byte-sized access
    { MoveByteRegisterAddress, 0x0041, registers(Target R register), source_address; cycles = 1, Increment::Yes, "move the value at address A into register R (1 byte)"},
    { MoveByteAddressRegister, 0x0042, registers(Source R register), target_address; cycles = 1, Increment::Yes, "move the contents of register R into memory at address A (1 byte)" },
    { MoveByteTargetPointer, 0x0043, registers(Target T target, Source P pointer); cycles = 1, Increment::Yes, "move the contents addressed by the value of register P into register T (1 byte)" },
    { MoveBytePointerSource, 0x0044, registers(Target P pointer, Source S source); cycles = 1, Increment::Yes, "move the contents of register S into memory at address specified by register P (1 byte)" },
    // move instructions for halfword-sized access
    { MoveHalfwordRegisterAddress, 0x0045, registers(Target R register), source_address; cycles = 1, Increment::Yes, "move the value at address A into register R (2 bytes)"},
    { MoveHalfwordAddressRegister, 0x0046, registers(Source R register), target_address; cycles = 1, Increment::Yes, "move the contents of register R into memory at address A (2 bytes)" },
    { MoveHalfwordTargetPointer, 0x0047, registers(Target T target, Source P pointer); cycles = 1, Increment::Yes, "move the contents addressed by the value of register P into register T (2 bytes)" },
    { MoveHalfwordPointerSource, 0x0048, registers(Target P pointer, Source S source); cycles = 1, Increment::Yes, "move the contents of register S into memory at address specified by register P (2 bytes)" },
    // offset move-instructions
    { MovePointerSourceOffset, 0x0049, registers(Target P pointer, Source S source), immediate; cycles = 1, Increment::Yes, "move the value in register S into memory at address pointer + immediate" },
    { MoveBytePointerSourceOffset, 0x004A, registers(Target P pointer, Source S source), immediate; cycles = 1, Increment::Yes, "move the value in register S into memory at address pointer + immediate (1 byte)" },
    { MoveHalfwordPointerSourceOffset, 0x004B, registers(Target P pointer, Source S source), immediate; cycles = 1, Increment::Yes, "move the value in register S into memory at address pointer + immediate (2 bytes)" },
    { MoveTargetPointerOffset, 0x004C, registers(Target T target, Source P pointer), immediate; cycles = 1, Increment::Yes, "move the contents addressed by the sum of the pointer and the immediate into the register T" },
    { MoveByteTargetPointerOffset, 0x004D, registers(Target T target, Source P pointer), immediate; cycles = 1, Increment::Yes, "move the contents addressed by the sum of the pointer and the immediate into the register T" },
    { MoveHalfwordTargetPointerOffset, 0x004E, registers(Target T target, Source P pointer), immediate; cycles = 1, Increment::Yes, "move the contents addressed by the sum of the pointer and the immediate into the register T" },

    // halt and catch fire
    { HaltAndCatchFire, 0x0006, registers(); cycles = 1, Increment::No, "halt and catch fire" },

    // artimetic (sic!) instructions
    { AddTargetLhsRhs, 0x0007, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "add the values in registers L and R, store the result in T, set zero and carry flags appropriately" },
    { AddWithCarryTargetLhsRhs, 0x0034, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "add (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately" },
    { SubtractTargetLhsRhs, 0x0008, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "subtract (without carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately" },
    { SubtractWithCarryTargetLhsRhs, 0x0009, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "subtract (with carry) the values in registers L and R, store the result in T, set zero and carry flags appropriately" },
    { MultiplyHighLowLhsRhs, 0x000A, registers(Target H high, Target T low, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "multiply the values in registers L and R, store the low part of the result in T, the high part in H, set zero and carry flags appropriately" },
    { DivmodTargetModLhsRhs, 0x000B, registers(Target D result, Target M remainder, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "divmod the values in registers L and R, store the result in D and the remainder in M set zero and divide-by-zero flags appropriately" },

    // bitwise instructions
    { AndTargetLhsRhs, 0x000C, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "and the values in registers LL and RR, store the result in TT, set zero flag appropriately" },
    { OrTargetLhsRhs, 0x000D, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "or the values in registers LL and RR, store the result in TT, set zero flag appropriately" },
    { XorTargetLhsRhs, 0x000E, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "xor the values in registers LL and RR, store the result in TT, set zero flag appropriately" },
    { NotTargetSource, 0x000F, registers(Target T target, Source S source); cycles = 1, Increment::Yes, "not the value in register SS, store the result in TT, set zero flag appropriately" },
    { LeftShiftTargetLhsRhs, 0x0010, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "left shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately" },
    { RightShiftTargetLhsRhs, 0x0011, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "right shift the value in register LL by RR bits, store the result in TT, set zero and carry flags appropriately" },
    { AddTargetSourceImmediate, 0x0012, registers(Target T target, Source S source), immediate; cycles = 1, Increment::Yes, "add the constant CC to the value in register SS and store the result in TT, set zero and carry flags appropriately" },
    { SubtractTargetSourceImmediate, 0x0013, registers(Target T target, Source S source), immediate; cycles = 1, Increment::Yes, "subtract the constant CC from the value in register SS and store the result in TT, set zero and carry flags appropriately" },

    // comparison
    { CompareTargetLhsRhs, 0x0014, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "compare the values in registers LL and RR, store the result (Word::MAX, 0, 1) in TT, set zero flag appropriately" },
    { BoolCompareEquals, 0x003A, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the values in registers L and R are equal and stores the result as boolean (0 or 1) in T" },
    { BoolCompareNotEquals, 0x003B, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the values in registers L and R are not equal and stores the result as boolean (0 or 1) in T" },
    { BoolCompareGreater, 0x003C, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the value in registers L is greater than the value in register R and stores the result as boolean (0 or 1) in T" },
    { BoolCompareGreaterOrEquals, 0x003D, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the value in registers L is greater than or equals the value in register R and stores the result as boolean (0 or 1) in T" },
    { BoolCompareLess, 0x003E, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the value in registers L is less than the value in register R and stores the result as boolean (0 or 1) in T" },
    { BoolCompareLessOrEquals, 0x003F, registers(Target T target, Source L lhs, Source R rhs); cycles = 1, Increment::Yes, "checks whether the value in registers L is less than or equals the value in register R and stores the result as boolean (0 or 1) in T" },

    // stack instructions
    { PushRegister, 0x0015, registers(Source R register); cycles = 1, Increment::Yes, "pushes the value of register RR onto the stack" },
    { PushImmediate, 0x004F, registers(), immediate; cycles = 1, Increment::Yes, "pushes the immediate value onto the stack" },
    { PopRegister, 0x0016, registers(Target R register); cycles = 1, Increment::Yes, "pops from the stack and stores the value in register RR" },
    { Pop, 0x0040, registers(); cycles = 1, Increment::Yes, "pops from the stack and discards the value" },
    { CallAddress, 0x0017, registers(), source_address; cycles = 1, Increment::No, "push the current instruction pointer onto the stack and jump to the specified address" },
    { CallRegister, 0x0036, registers(Source R register); cycles = 1, Increment::No, "push the current instruction pointer onto the stack and jump to the address stored in register R" },
    { CallPointer, 0x0037, registers(Source P pointer); cycles = 1, Increment::No, "push the current instruction pointer onto the stack and jump to the address stored in memory at the location specified by the value in register P" },
    { Return, 0x0018, registers(); cycles = 1, Increment::No, "pop the return address from the stack and jump to it" },

    // unconditional jumps
    { JumpImmediate, 0x0019, registers(), immediate; cycles = 1, Increment::No, "jump to the given address" },
    { JumpRegister, 0x001A, registers(Source R register); cycles = 1, Increment::No, "jump to the address stored in register R" },

    // conditional jumps, address given as immediate
    { JumpImmediateIfEqual, 0x001B, registers(Source C comparison), immediate; cycles = 1, Increment::No, "jump to the specified address if the comparison result in register C corresponds to \\"equality\\"" },
    { JumpImmediateIfGreaterThan, 0x001C, registers(Source C comparison), immediate; cycles = 1, Increment::No, "jump to the specified address if the comparison result in register C corresponds to \\"greater than\\"" },
    { JumpImmediateIfLessThan, 0x001D, registers(Source C comparison), immediate; cycles = 1, Increment::No, "jump to the specified address if the comparison result in register C corresponds to \\"less than\\"" },
    { JumpImmediateIfGreaterThanOrEqual, 0x001E, registers(Source C comparison), immediate; cycles = 1, Increment::No, "jump to the specified address if the comparison result in register C corresponds to \\"greater than\\" or \\"equal\\"" },
    { JumpImmediateIfLessThanOrEqual, 0x001F, registers(Source C comparison), immediate; cycles = 1, Increment::No, "jump to the specified address if the comparison result in register C corresponds to \\"less than\\" or \\"equal\\"" },
    { JumpImmediateIfZero, 0x0020, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the zero flag is set" },
    { JumpImmediateIfNotZero, 0x0021, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the zero flag is not set" },
    { JumpImmediateIfCarry, 0x0022, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the carry flag is set" },
    { JumpImmediateIfNotCarry, 0x0023, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the carry flag is not set" },
    { JumpImmediateIfDivideByZero, 0x0024, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the divide by zero flag is set" },
    { JumpImmediateIfNotDivideByZero, 0x0025, registers(), immediate; cycles = 1, Increment::No, "jump to the specified address if the divide by zero flag is not set" },

    // conditional jumps, address given as register
    { JumpRegisterIfEqual, 0x0026, registers(Source P pointer, Source C comparison); cycles = 1, Increment::No, "jump to the address specified in register P if the comparison result in register C corresponds to \\"equality\\"" },
    { JumpRegisterIfGreaterThan, 0x0027, registers(Source P pointer, Source C comparison); cycles = 1, Increment::No, "jump to the address specified in register P if the comparison result in register C corresponds to \\"greater than\\"" },
    { JumpRegisterIfLessThan, 0x0028, registers(Source P pointer, Source C comparison); cycles = 1, Increment::No, "jump to the address specified in register P if the comparison result in register C corresponds to \\"less than\\"" },
    { JumpRegisterIfGreaterThanOrEqual, 0x0029, registers(Source P pointer, Source C comparison); cycles = 1, Increment::No, "jump to the address specified in register P if the comparison result in register C corresponds to \\"greater than\\" or \\"equal\\"" },
    { JumpRegisterIfLessThanOrEqual, 0x002A, registers(Source P pointer, Source C comparison); cycles = 1, Increment::No, "jump to the address specified in register P if the comparison result in register C corresponds to \\"less than\\" or \\"equal\\"" },
    { JumpRegisterIfZero, 0x002B, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the zero flag is set" },
    { JumpRegisterIfNotZero, 0x002C, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the zero flag is not set" },
    { JumpRegisterIfCarry, 0x002D, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the carry flag is set" },
    { JumpRegisterIfNotCarry, 0x002E, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the carry flag is not set" },
    { JumpRegisterIfDivideByZero, 0x002F, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the divide by zero flag is set" },
    { JumpRegisterIfNotDivideByZero, 0x0030, registers(Source P pointer); cycles = 1, Increment::No, "jump to the address specified in register P if the divide by zero flag is not set" },

    // no-op
    { NoOp, 0x0031, registers(); cycles = 1, Increment::Yes, "does nothing" },

    // input
    { GetKeyState, 0x0032, registers(Target T target, Source K keycode); cycles = 1, Increment::Yes, "store the keystate (1 = held down, 0 = not held down) of the key specified by register K into register T and set the zero flag appropriately" },

    // Timing
    { PollTime, 0x0033, registers(Target H high, Target L low); cycles = 1, Increment::Yes, "store the number of milliseconds since the UNIX epoch into registers high and low" },

    // Rendering
    { SwapFramebuffers, 0x0035, registers(); cycles = 1, Increment::Yes, "swap the display buffers" },
    { InvisibleFramebufferAddress, 0x0038, registers(Target T target); cycles = 1, Increment::Yes, "get the start address of the framebuffer that's currently invisible (use the address to draw without tearing)" },

    // Debugging and profiling
    { PollCycleCountHighLow, 0x0039, registers(Target H high, Target L low); cycles = 1, Increment::Yes, "store the current cycle (64 bit value) count into registers H and L (H: most significant bytes, L: least significant bytes)" },
    { DumpRegisters, 0xFFFF, registers(); cycles = 1, Increment::Yes, "dump the contents of all registers into the file 'registers_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number" },
    { DumpMemory, 0xFFFE, registers(); cycles = 1, Increment::Yes, "dump the contents of the whole memory into the file 'memory_YYYY-MM-DD_X.bin' where YYYY-MM-DD is the current date and X is an increasing number" },
    { AssertRegisterRegister, 0xFFFD, registers(Source E expected, Source A actual); cycles = 1, Increment::Yes, "assert that the expected register value equals the actual register value (behavior of the VM on a failed assertion is implementation defined)" },
    { AssertRegisterImmediate, 0xFFFC, registers(Source A actual), immediate; cycles = 1, Increment::Yes, "assert that the actual register value equals the immediate (behavior of the VM on a failed assertion is implementation defined)"},
    { AssertPointerImmediate, 0xFFFB, registers(Source P pointer), immediate; cycles = 1, Increment::Yes, "assert that the value in memory pointed at by P equals the immediate (behavior of the VM on a failed assertion is implementation defined)"},
    { DebugBreak, 0xFFFA, registers(); cycles = 1, Increment::Yes, "behavior is implementation defined" },
    { PrintRegister, 0xFFF9, registers(Source R register); cycles = 1, Increment::Yes, "prints the value of the register as debug output"},
    { Checkpoint, 0xFFF8, registers(), immediate; cycles = 1, Increment::Yes, "makes the emulator check the value of the internal checkpoint counter, fails on mismatch" },`

export type LineType = "comment" | "opCode"

export type RegisterType = "Target" | "Source"

export type Register = {
    name: string
    letter: string
    type: RegisterType
}

export type DataMap = {
    comment: string
    opCode: {
        name: string
        registers: Register[]
        immediate: boolean
        source_address: boolean
        target_address: boolean
        opCode: number
        cycles: number
        increment: boolean
        description: string
    }
}

export type ParsedType<T extends LineType = LineType> = {
    type: T
    data: DataMap[T]
}

// only changed the type, so that next has to pass the value, no undefined allowed!
interface CustomGenerator<T = unknown, TReturn = any, TNext = unknown>
    extends Iterator<T, TReturn, TNext> {
    next(...args: [TNext]): IteratorResult<T, TReturn>
    return(value: TReturn): IteratorResult<T, TReturn>
    throw(e: any): IteratorResult<T, TReturn>
    [Symbol.iterator](): CustomGenerator<T, TReturn, TNext>
}

const contextual = <RType = any>(
    generatorFn: () => CustomGenerator<
        Parser<any, string, string>,
        string | RType,
        string | undefined
    >
) => {
    return succeedWith<string, string, string>("").chain(
        (a: string | undefined): Parser<string, string, string> => {
            const iterator: CustomGenerator<
                Parser<any, string, string>,
                string | RType,
                string
            > = generatorFn()

            const runStep: (
                nextValue: string
            ) => Parser<any, string, string> = (nextValue) => {
                const { done, value } = iterator.next(nextValue)

                if (done) {
                    return succeedWith(value)
                }
                if (!(value instanceof Parser)) {
                    throw new Error(
                        "contextual: yielded values must always be parsers!"
                    )
                }
                const nextParser: Parser<any, string, string> = value

                return nextParser.chain(runStep)
            }

            return runStep("")
        }
    )
}

const registerParser: Parser<Register | string, string, any> = contextual(
    function* (): CustomGenerator<
        Parser<any, string, any>,
        Register | string,
        string
    > {
        const type = (yield choice([
            str("Target"),
            str("Source"),
        ])) as RegisterType

        yield optionalWhitespace

        const letter = yield regex(/^[A-Z]{1}/)

        yield optionalWhitespace

        const name = yield letters

        return {
            type,
            letter,
            name,
        }
    }
)

const definition: Parser<
    ParsedType<"opCode"> | Register | string,
    string,
    any
> = contextual<ParsedType<"opCode"> | Register>(function* (): CustomGenerator<
    Parser<any, string, any>,
    ParsedType<"opCode"> | string | Register,
    string
> {
    const delimiter = (ch = ",") => {
        return optionalWhitespace.chain(() =>
            char(ch).chain(() => optionalWhitespace)
        )
    }

    yield delimiter("{")

    const name = yield letters

    yield delimiter(",")

    const opCode = parseInt(yield regex(/^(0x[0-9a-fA-F]*)/), 16)

    yield delimiter(",")

    yield str("registers(")

    const registers = (yield possibly(
        sepBy(delimiter(","))(registerParser)
    )) as unknown as Register[]

    yield char(")")

    // these three can possibly also be a choice, since not all are present at the same time, only one at a time is present!

    const immediate =
        (yield possibly(delimiter(",").chain(() => str("immediate")))) !== null

    const source_address =
        (yield possibly(delimiter(",").chain(() => str("source_address")))) !==
        null

    const target_address =
        (yield possibly(delimiter(",").chain(() => str("target_address")))) !==
        null

    yield delimiter(";")

    yield str("cycles")

    yield delimiter("=")

    const cycles = parseInt(yield digits)

    yield delimiter(",")

    yield str("Increment::")

    const increment = (yield choice([str("Yes"), str("No")])) == "Yes"

    yield delimiter(",")

    yield char('"')

    // regex magic for matching escaped quotes!
    const descriptionUnescaped = yield regex(/^((?:\\.|[^\\"])*)/)

    const description = descriptionUnescaped.replaceAll(
        /\\([bfnrtv'"\\]{1})/g,
        (match: string): string => {
            const map: { [key: string]: string } = {
                b: "\b",
                f: "\f",
                n: "\n",
                r: "\r",
                t: "\t",
                v: "\v",
            }
            return map[match] ?? match
        }
    )

    yield char('"')

    yield delimiter("}")

    yield possibly(char(","))

    return {
        type: "opCode",
        data: {
            name,
            opCode,
            registers,
            immediate,
            source_address,
            target_address,
            cycles,
            increment,
            description,
        },
    }
})

const comment: Parser<
    ParsedType<"comment">,
    string,
    any
> = optionalWhitespace.chain((_) =>
    str("//")
        .chain((_) => optionalWhitespace.chain((_) => regex(/^(.*)/)))
        .map((data) => ({ type: "comment", data }))
)

const newLine = choice([char("\n"), char("\n")])

const final: Parser<ParsedType[], string, any> = sepBy(newLine)(
    choice([definition, comment])
) as unknown as Parser<ParsedType[], string, any>

const parsed = final.run(opcodes)

export type OPObject = {
    immediate?: number
    source_address?: number
    target_address?: number
    opCode: number
    cycles: bigint
    increment: boolean
} & Record<string, any>

if (!parsed.isError) {
    const ops = parsed.result

    const generatedTypescript: string[] = []
    const opNames: string[] = []
    const opObjects: string[] = []
    const opMap: string[] = []

    for (const { type, data } of ops) {
        if (type === "opCode") {
            const {
                name,
                opCode,
                registers,
                immediate,
                source_address,
                target_address,
                cycles,
                increment,
                description,
            } = data as DataMap["opCode"]

            opNames.push(name)

            const opObject: OPObject = {
                cycles: BigInt(cycles),
                opCode,
                increment,
            }

            const amount = [immediate, target_address, source_address].reduce(
                (acc, state) => acc + (state ? 1 : 0),
                0
            )
            if (amount > 1) {
                throw new Error(
                    `Maximal one of 'immediate, target_address and source_address' can be specified : ${JSON.stringify(
                        { immediate, target_address, source_address }
                    )}`
                )
            }

            // TODO check these sizes!

            // this values map to their size!
            if (immediate) {
                opObject.immediate = HalfWord.SIZE
            }

            if (target_address) {
                opObject.target_address = HalfWord.SIZE
            }

            if (source_address) {
                opObject.source_address = HalfWord.SIZE
            }

            //TODO figure out the right layout for this!!
            for (const { name, letter, type } of registers) {
                opObject[name] = `Register.fromLetter("${letter}")`
            }

            const singleOpCode = [
                "/**",
                `* @description ${description}`,
                "*/",
                `${name} : {`,
                Object.entries(opObject)
                    .map(
                        ([key, value]) =>
                            `${key} : ${
                                typeof value === "bigint"
                                    ? `${value.toString()}n`
                                    : value
                            }`
                    )
                    .join(",\n"),
                "}",
            ]

            opObjects.push(singleOpCode.join("\n"))

            const map = `${opCode}: "${name}"`

            opMap.push(map)
        }
    }

    generatedTypescript.push(
        "export type OPCodeDefinitions = typeof opDefinitions"
    )

    generatedTypescript.push("")
/*     generatedTypescript.push(
        `export type OpCodeNames  = ${opNames
            .map((type) => `"${type}"`)
            .join(" | ")} ;`
    )

    generatedTypescript.push("") */

    generatedTypescript.push(
        `export const opDefinitions = {${opObjects.join(",\n")}}`
    )

    generatedTypescript.push("")

    generatedTypescript.push(
        `export const opMap : OpMap = {${opMap.join(",\n")}}`
    )

    const fileHeader = readFileSync(join(__dirname, "opcodes.ts")).toString()
    writeFileSync(
        join(__dirname, "../src", "opcodes.generated.ts"),
        fileHeader + "\n" + generatedTypescript.join("\n")
    )

    console.log(`Successfully generated ts!`)
} else {
    console.error(parsed.error)
    const index = parsed.index
    const start = Math.max(index - 10, 0)
    const end = Math.min(index + 30, opcodes.length)
    console.warn("Error was here:", opcodes.substring(start, end))
    exit(1)
}
