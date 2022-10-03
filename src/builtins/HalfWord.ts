import * as Byte from "./Byte";
import { unpack, packTo } from "byte-data"
import { Address } from "../address_constants"

export const SIZE = 2

export type HalfWord = number

export const bits = Byte.bits * SIZE; 

export function fromBEBytes(slice: Uint8Array): HalfWord {
    return unpack(slice, { bits, signed: false, be: true }, 0, true)
}

export function saveAsBEBytes(
    buffer: Uint8Array,
    address: Address,
    value: HalfWord
): void {
    packTo(value, { bits, signed: false, be: true }, buffer, address)
}