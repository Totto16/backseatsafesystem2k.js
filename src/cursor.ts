export enum CursorMode {
    Blinking = 0,
    Visible = 1,
    Invisible = 2,
}

export type Duration = number

export type Instant = number

export class Cursor {
    visible: boolean
    timeOfNextToggle: Instant
    static TOGGLE_INTERVAL: Duration = 400
    constructor(visible: boolean, timeOfNextToggle: Instant) {
        this.visible = visible
        this.timeOfNextToggle = timeOfNextToggle
    }
}
