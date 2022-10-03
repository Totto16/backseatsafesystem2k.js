//use crate::{display, terminal, Address, Byte, Size, Word};
import * as Byte from "./builtins/Byte"
import * as Word from "./builtins/Word"
import * as terminal from "./terminal"
import * as display from "./display"

export const TERMINAL_BUFFER_START: Address = 0
export const TERMINAL_BUFFER_SIZE: number =
    terminal.WIDTH * terminal.HEIGHT * Byte.SIZE
export const TERMINAL_BUFFER_END: Address =
    TERMINAL_BUFFER_START + TERMINAL_BUFFER_SIZE
export const TERMINAL_CURSOR_POINTER: Address = TERMINAL_BUFFER_END
export const TERMINAL_CURSOR_MODE: Address = TERMINAL_CURSOR_POINTER + Word.SIZE
export const FRAMEBUFFER_SIZE: Address = display.WIDTH * display.HEIGHT * 4 // RGBA
export const FIRST_FRAMEBUFFER_START: Address =
    TERMINAL_BUFFER_START +
    TERMINAL_BUFFER_SIZE +
    2 * Word.SIZE /* 2 extra words for Cursor data */
export const SECOND_FRAMEBUFFER_START: Address =
    FIRST_FRAMEBUFFER_START + FRAMEBUFFER_SIZE
export const STACK_START: Address = SECOND_FRAMEBUFFER_START + FRAMEBUFFER_SIZE
export const STACK_SIZE: number = 512 * 1024
export const ENTRY_POINT: Address = STACK_START + STACK_SIZE




export type Address = Word.Word

