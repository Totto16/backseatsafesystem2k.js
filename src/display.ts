export const WIDTH: number = 480
export const HEIGHT: number = (WIDTH / 4) * 3

import {
    SECOND_FRAMEBUFFER_START,
    FIRST_FRAMEBUFFER_START,
    FRAMEBUFFER_SIZE,
    Address,
} from "./address_constants"
import { SCREEN_SIZE } from "./main"
import { Memory } from "./memory"
import * as terminal from "./terminal"

export interface BasicDisplay {
    swap: () => void
    isFirstFramebufferVisible: () => boolean

    render: (memory: Memory, handle: terminal.DrawHandle) => void
    invisible_framebuffer_address: () => Address
}

export class MockDisplay implements BasicDisplay {
    firstFramebufferVisible: boolean

    constructor() {
        this.firstFramebufferVisible = true
    }

    invisible_framebuffer_address(): Address {
        return this.isFirstFramebufferVisible()
            ? SECOND_FRAMEBUFFER_START
            : FIRST_FRAMEBUFFER_START
    }

    swap() {
        this.firstFramebufferVisible = !this.firstFramebufferVisible
        // TODO swap the canvas frames
        // canvasElement.style.display = index === 1 ? "none" : "unset"
    }

    isFirstFramebufferVisible(): boolean {
        return this.firstFramebufferVisible
    }

    getCurrentCtx(handle: terminal.DrawHandle): CanvasRenderingContext2D {
        const index = this.isFirstFramebufferVisible() ? 0 : 1
        const ctx = handle[index].getContext("2d")
        if (ctx === null) {
            throw new Error("Context is undefined!")
        }
        return ctx
    }

    render(_memory: Memory, _handle: terminal.DrawHandle) {
        throw new Error("unreachable")
    }
}

export const FONT_SIZE = 10

export class DisplayImplementation extends MockDisplay {
    font: FontFace

    constructor(handle: terminal.DrawHandle) {
        super()

        handle[0].style.display = "unset !important;"
        handle[1].style.display = "none !important;"

        const fontFace = new FontFace(
            "myFont",
            "url(resources/CozetteVector.ttf)"
        )
        fontFace.load().then((font: FontFace) => {
            this.font = font
            ;[0, 1].map((i) => {
                const ctx = handle[i].getContext("2d")
                if (ctx !== null) {
                    ctx.font = `${FONT_SIZE}px ${font.family}`
                }
            })
        })

        this.font = fontFace

        const ctx = this.getCurrentCtx(handle)

        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, terminal.WIDTH, terminal.HEIGHT)
    }
}

export class Display extends DisplayImplementation {
    render(memory: Memory, handle: terminal.DrawHandle) {
        // TODO, tint color would be necessary to implement using canvas tint mode, but thats not necessary here, since it's white
        let tint_color = {
            r: 0xff,
            g: 0xff,
            b: 0xff,
            a: 0xff,
        }

        // TODO use this scale:
        const scale = SCREEN_SIZE.height / HEIGHT
        const framebufferStart = this.isFirstFramebufferVisible()
            ? FIRST_FRAMEBUFFER_START
            : SECOND_FRAMEBUFFER_START

        const ctx = this.getCurrentCtx(handle)

        const array = new Uint8ClampedArray(
            memory.data.buffer,
            framebufferStart,
            FRAMEBUFFER_SIZE
        )

        const imageData = new ImageData(array, WIDTH, HEIGHT)

        ctx.putImageData(imageData, 0, 0)
    }
}
