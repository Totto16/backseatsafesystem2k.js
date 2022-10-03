import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 1

export type Byte = number

export const bits = 8

export function fromBEBytes(slice: Uint8ClampedArray): Byte {
    return unpack(slice, { bits, signed: false, be: true }, 0, true)
}

export function saveAsBEBytes(
    buffer: Uint8ClampedArray,
    address: Address,
    value: Byte
): void {
    packTo(value, { bits, signed: false, be: true }, buffer, address)
}
