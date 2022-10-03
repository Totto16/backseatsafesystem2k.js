import * as Byte from "./Byte"
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 4

export type Word = number

export const bits = Byte.bits * SIZE

export function fromBEBytes(slice: Uint8ClampedArray): Word {
    return unpack(slice, { bits, signed: false, be: true }, 0, true)
}

export function saveAsBEBytes(
    buffer: Uint8ClampedArray,
    address: Address,
    value: Word
): void {
    packTo(value, { bits, signed: false, be: true }, buffer, address)
}
