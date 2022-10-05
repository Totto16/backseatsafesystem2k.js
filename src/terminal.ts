// featuring Tom Hanks

import assert from "assert"
import {
    TERMINAL_CURSOR_POINTER,
    Address,
    TERMINAL_BUFFER_START,
} from "./address_constants"
import { Cursor } from "./cursor"
import { Display } from "./display"
import { Memory } from "./memory"

export const WIDTH: number = 80
export const HEIGHT: number = 25

export type Vector2 = [number, number]

export type DrawHandle = [HTMLCanvasElement, HTMLCanvasElement]

export interface FontProperties {
    size: number
    height: number
}

export function render(
    memory: Memory,
    drawHandle: DrawHandle,
    [x, y]: Vector2,
    font: FontFace,
    { size, height }: FontProperties,
    cursor: Cursor,
    display: Display
) {
    const cursor_pointer = memory.readData(TERMINAL_CURSOR_POINTER)
    assert(TERMINAL_BUFFER_START == 0) // to assume we get no overflow

    const cursorIndex = cursor_pointer - TERMINAL_BUFFER_START
    const cursorRow = cursorIndex / WIDTH
    const cursorColumn = cursorIndex % WIDTH

    for (let row = 0; row < HEIGHT; ++row) {
        // let words = &memory[row * WIDTH..][..WIDTH];
        const string: string[] = new Array(WIDTH)
            .fill(undefined)
            .map((i) =>
                memory.readByte(TERMINAL_BUFFER_START + (row * WIDTH + i))
            )
            .map((byte) =>
                byte < 32 || byte > 255 ? " " : String.fromCharCode(byte)
            )
        if (row == cursorRow && cursor.visible) {
            string[cursorColumn] = "_"
        }
        const text: string = string.join("")

        // TODO since it's using two canvases, i get the current active, maybe this is switched out, so I need to get the other one, investigate the usage of multiple canvases,
        // or better just clear after each frame, that needs a redraw!!

        const ctx = display.getCurrentCtx(drawHandle)

        // TODO get the font in here!
        ctx.font = `${size}px ${font.family}`
        ctx.fillStyle = "white"

        // doesn't affect anything
        // ctx.lineWidth  = 5.0;

        ctx.fillText(text, x, y + row * height)
    }
}
