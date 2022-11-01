import { packTo, unpack } from "byte-data"
import { Address } from "../address_constants"
import * as Byte from "./Byte"
import { u16 } from "./types"
import * as Word from "./Word"

export const SIZE = 2

export type HalfWord = u16

export const bits = Byte.bits * SIZE

export function fromBEBytes(array: Uint8ClampedArray): HalfWord {
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
    value: HalfWord
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(array.buffer),
        address,
        true
    )
}

export function toHalfWord(input: Word.Word) {
    return Byte.clamp(input, 0, (1 << bits) - 1)
}

export function isHalfWord(number: Word.Word) {
    return number >= 0 && number < 1 << bits
}
