import {
    SECOND_FRAMEBUFFER_START,
    FIRST_FRAMEBUFFER_START,
    FRAMEBUFFER_SIZE,
    Address,
} from "./address_constants"
import { SCREEN_SIZE } from "./main"
import { Memory } from "./memory"
import { DrawHandle } from "./terminal"

export const WIDTH: number = 480
export const HEIGHT: number = (WIDTH / 4) * 3

export interface BasicDisplay {
    swap: () => void
    is_first_framebuffer_visible: () => boolean

    render: (memory: Memory, handle: DrawHandle) => void
    invisible_framebuffer_address: () => Address
}

export class MockDisplay implements BasicDisplay {
    first_framebuffer_visible: boolean

    constructor() {
        this.first_framebuffer_visible = true
    }

    invisible_framebuffer_address(): Address {
        return this.is_first_framebuffer_visible()
            ? SECOND_FRAMEBUFFER_START
            : FIRST_FRAMEBUFFER_START
    }

    swap() {
        this.first_framebuffer_visible = !this.first_framebuffer_visible
    }

    is_first_framebuffer_visible(): boolean {
        return this.first_framebuffer_visible
    }

    render(_memory: Memory, _handle: DrawHandle) {
        // do nothing
    }
}

export const FONT_SIZE = 10

export class DisplayImplementation extends MockDisplay {
    font: FontFace

    constructor(handle: DrawHandle) {
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
    }
}

export class Display extends DisplayImplementation {
    render(memory: Memory, handle: DrawHandle) {
        // TODO, tint color would be necessary to implement using canvas tint mode, but thats not necessary here, since it's white
        let tint_color = {
            r: 0xff,
            g: 0xff,
            b: 0xff,
            a: 0xff,
        }

        const scale = SCREEN_SIZE.height / HEIGHT
        const framebuffer_start = this.is_first_framebuffer_visible()
            ? FIRST_FRAMEBUFFER_START
            : SECOND_FRAMEBUFFER_START

        const ctx = this.getCurrentCtx(handle)

        const imageData = new ImageData(
            new Uint8ClampedArray(
                memory.data,
                framebuffer_start,
                FRAMEBUFFER_SIZE
            ),
            WIDTH,
            HEIGHT
        )
        ctx.putImageData(imageData, 0, 0)
    }

    getCurrentCtx(handle: DrawHandle): CanvasRenderingContext2D {
        const index = this.is_first_framebuffer_visible() ? 0 : 1
        const ctx = handle[index].getContext("2d")
        if (ctx === null) {
            throw new Error("Context is undefined!")
        }
        return ctx
    }
}
