import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"
import { u8 } from "./types"
import * as Word from "./Word"

export const SIZE = 1

export type Byte = u8

export const bits = 8

export function fromBEBytes(array: Uint8ClampedArray): Byte {
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
    value: Byte
): void {
    packTo(
        value,
        { bits, signed: false, be: true },
        new Uint8Array(array.buffer),
        address,
        true
    )
}

export function clamp(number: Word.Word, min: Word.Word, max: Word.Word) {
    return Math.min(Math.max(number, min), max)
}

export function toByte(input: Word.Word) {
    return clamp(input, 0, (1 << bits) - 1)
}

export function isByte(number: Word.Word) {
    return number >= 0 && number < 1 << bits
}
