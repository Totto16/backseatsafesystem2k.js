import { packTo, unpack } from "byte-data"
import { Address } from "../address_constants"
import { Processor } from "../processor"
import * as Byte from "./Byte"
import * as HalfWord from "./HalfWord"
import * as Instruction from "./Instruction"
import { u32, u64 } from "./types"

import { assert } from "./utils"

export const SIZE = 4

export type Word = u32

export const bits = Byte.bits * SIZE

export const MAX = Math.pow(2, 32) - 1

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

export type WordBytes = [Byte.Byte, Byte.Byte, Byte.Byte, Byte.Byte]

export function toBEBytes(value: Word): WordBytes {
    const array = new Uint8ClampedArray(new ArrayBuffer(SIZE))
    saveAsBEBytes(array, 0, value)
    return Array.from(array) as WordBytes
}

export function asHalfWords(
    value: Word
): [HalfWord.HalfWord, HalfWord.HalfWord] {
    const binaryString = value.toString(2).padStart(bits, "0")
    return [
        binaryString.substring(0, HalfWord.SIZE * Byte.bits),
        binaryString.substring(HalfWord.SIZE * Byte.bits),
    ].map((a) => parseInt(a, 2)) as [HalfWord.HalfWord, HalfWord.HalfWord]
}

export function isWord(number: Word | Instruction.Instruction) {
    if (typeof number === "number") {
        return number >= 0 && number <= MAX
    } else {
        return number >= 0n && number < 1n << BigInt(bits)
    }
}

export type OrArray<T> = T | T[]

export function assertIsWord(
    number: OrArray<Word | Instruction.Instruction>
): void {
    if (Array.isArray(number)) {
        return number.forEach(assertIsWord)
    }
    assert(
        isWord(number),
        true,
        `Expected value to be word, but was: ${
            typeof number === "bigint"
                ? Instruction.toBEBytes(number)
                : Byte.toHexString(toBEBytes(number))
        }`
    )
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
    lhs: Word,
    rhs: Word,
    processor: Processor,
    withCarry?: boolean
): CalculationWithOverflow {
    assertIsWord([lhs, rhs])

    const carryBit = withCarry ? (processor?.getFlag("Carry") ? 1 : 0) : 0
    let result = lhs + rhs + carryBit
    let didOverflow = false

    if (!isWord(result)) {
        didOverflow = true
        result = result % (MAX + 1)
        assertIsWord(result)
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
    assertIsWord([lhs, rhs])
    const carryBit = withCarry ? (processor?.getFlag("Carry") ? 1 : 0) : 0
    let result = lhs - rhs - carryBit
    let didOverflow = false

    if (!isWord(result)) {
        didOverflow = true
        result = MAX + 1 + (result % (MAX + 1))
        assertIsWord(result)
    }

    setFlags({ didOverflow, result }, processor)

    return { didOverflow, result }
}

export function overflowingMul(
    lhs: Word,
    rhs: Word,
    processor: Processor
): CalculationWithOverflow<u64> {
    assertIsWord([lhs, rhs])

    let result = BigInt(lhs) * BigInt(rhs)
    let didOverflow = false

    // TODO investigate, in the original the carry flag is set, when the multiplication is overflowing into the high register, is this intended and correct??!
    if (!isWord(result)) {
        didOverflow = true
    }

    if (!Instruction.isInstruction(result)) {
        didOverflow = true
        result = result % (1n << BigInt(Instruction.bits))
        assert(Instruction.isInstruction(result))
    }

    setFlags<Instruction.Instruction>({ didOverflow, result }, processor)

    return { didOverflow, result }
}

export function overflowingLeftShift(
    lhs: Word,
    rhs: Word,
    processor: Processor
): CalculationWithOverflow {
    assertIsWord([lhs, rhs])

    let temp = rhs > bits ? 0n : BigInt(lhs) << BigInt(rhs)
    let didOverflow = false

    if (!isWord(temp)) {
        didOverflow = true
        temp = temp % (1n << BigInt(bits))
        assertIsWord(temp)
    }
    const [zero, result] = Instruction.asWords(temp)
    assert(zero === 0)

    // TODO investigate this condition:
    // processor.set_flag(Flag::Carry, rhs > lhs.leading_zeros());

    setFlags(
        { didOverflow: rhs > bits ? lhs > 0 : didOverflow, result },
        processor
    )

    return { didOverflow, result }
}

export function overflowingRightShift(
    lhs: Word,
    rhs: Word,
    processor: Processor
): CalculationWithOverflow {
    assertIsWord([lhs, rhs])

    let result = rhs > bits ? 0 : lhs >> rhs
    let didOverflow = false

    if (!isWord(result)) {
        didOverflow = true
        result = result % (1 << bits)
        assertIsWord(result)
    }

    // TODO investigate this condition:
    // processor.set_flag(Flag::Carry, rhs > lhs.trailing_zeros());

    setFlags(
        { didOverflow: rhs > bits ? lhs > 0 : didOverflow, result },
        processor
    )

    return { didOverflow, result }
}

export function toWord(input: Word) {
    return Byte.clamp(input, 0, MAX)
}
