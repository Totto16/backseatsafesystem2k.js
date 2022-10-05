import * as Byte from "./Byte"
import * as HalfWord from "./HalfWord"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"
import { u32, u64 } from "./types"
import { Processor } from "../processor"
import * as Instruction from "./Instruction"

export const SIZE = 4

export type Word = u32

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): Word {
    return unpack(
        new Uint8Array(array),
        { bits, signed: false, be: true },
        0,
        true
    )
}

export function saveAsBEBytes(
    array: Uint8ClampedArray,
    address: Address,
    value: Word
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(array.buffer),
        address,
        true
    )
}

export function asHalfWords(
    value: Word
): [HalfWord.HalfWord, HalfWord.HalfWord] {
    const binaryString = value.toString(2)
    return [
        binaryString.substring(0, HalfWord.SIZE * Byte.bits),
        binaryString.substring(HalfWord.SIZE * Byte.bits),
    ].map((a) => parseInt(a, 2)) as [HalfWord.HalfWord, HalfWord.HalfWord]
}

export function isWord(number: Word | Instruction.Instruction) {
    if (typeof number === "number") {
        return number >= 0 && number < (1 << bits) >>> 0
    } else {
        return number >= 0n && number < 1n << BigInt(bits.toString())
    }
}

export interface CalculationWithOverflow<T extends number | BigInt = Word> {
    result: T
    didOverflow: boolean
}

export interface CalculationInput {
    lhs: Word
    rhs: Word
}

export function setFlags<T extends number | BigInt = Word>(
    { result, didOverflow }: CalculationWithOverflow<T>,
    processor: Processor
) {
    processor.setFlag("Zero", result === 0)
    processor.setFlag("Carry", didOverflow)
}

export function overflowingAdd(
    { lhs, rhs }: CalculationInput,
    processor: Processor,
    withCarry?: boolean
): CalculationWithOverflow {
    console.assert(isWord(lhs) && isWord(rhs))

    const carryBit = withCarry ? (processor?.getFlag("Carry") ? 1 : 0) : 0
    let result = lhs + rhs + carryBit
    let didOverflow = false

    if (!isWord(result)) {
        didOverflow = true
        result = result % ((1 << bits) >>> 0)
        console.assert(isWord(result))
    }

    setFlags({ didOverflow, result }, processor)

    return { didOverflow, result }
}

export function overflowingSub(
    lhs: Word,
    rhs: Word,
    processor: Processor,
    withCarry?: boolean
): CalculationWithOverflow {
    console.assert(isWord(lhs) && isWord(rhs))
    const carryBit = withCarry ? (processor?.getFlag("Carry") ? 1 : 0) : 0
    let result = lhs - rhs - carryBit
    let didOverflow = false

    if (!isWord(result)) {
        didOverflow = true
        result = ((1 << bits) >>> 0) + (result % ((1 << bits) >>> 0))
        console.assert(isWord(result))
    }

    setFlags({ didOverflow, result }, processor)

    return { didOverflow, result }
}

export function overflowingMul(
    lhs: Word,
    rhs: Word,
    processor: Processor
): CalculationWithOverflow<u64> {
    console.assert(isWord(lhs) && isWord(rhs))

    let result = BigInt(lhs.toString()) * BigInt(rhs.toString())
    let didOverflow = false

    // TODO investigate, in the original the carry flag is set, when the multiplication is overflowing into the high register, is this intended and correct??!
    if (!isWord(result)) {
        didOverflow = true
    }

    if (!Instruction.isInstruction(result)) {
        didOverflow = true
        result = result % (1n << BigInt(Instruction.bits.toString()))
        console.assert(Instruction.isInstruction(result))
    }

    setFlags<Instruction.Instruction>({ didOverflow, result }, processor)

    return { didOverflow, result }
}