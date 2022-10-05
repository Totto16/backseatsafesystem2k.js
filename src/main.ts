import { PseudoFile } from "."
import { Address, ENTRY_POINT } from "./address_constants"
import { Cursor } from "./cursor"
import { Display } from "./display"
import { Keyboard } from "./keyboard"
import { Machine } from "./machine"
import { Memory } from "./memory"
import { Periphery } from "./periphery"
import { Register } from "./processor"
import { DrawHandle } from "./terminal"
import { Timer } from "./timer"
import * as Word from "./builtins/Word"
import * as Instruction from "./builtins/Instruction"
import { u64 } from "./builtins/types"
import { OpCode } from "./opcodes.generated"
import * as terminal from "./terminal"

export interface Size2D {
    width: number
    height: number
}

export const SCREEN_SIZE: Size2D = {
    width: 1280,
    height: 720,
}

export const OPCODE_LENGTH: number = 16

export const TARGET_FPS: number = 60

export type Path = string

export type Action = {
    /// Execute a ROM file (typically *.backseat)
    Run: {
        /// The path to the ROM file to be executed
        path: Path

        /// Applying this flag makes the application quit when executing the 'halt and catch fire'-
        /// instruction.
        exitOnHalt: boolean
    }
    /// Emit a sample program as machine code
    Emit: {
        /// Output path of the machine code to be written
        path: Path
    }
    /// Write the available opcodes and other information such as constants in JSON format
    Json: {
        /// Output path of the JSON file to be written
        path: Path
    }
}

export type PossibleAction = "Run" | "Emit" | "Json"

/// The typescript web based implementation of the backseat-safe-system-2k, everything was modifies from the reference implementation
export interface Args<P extends PossibleAction = PossibleAction> {
    action: P
    arguments: Action[P]
}

export function runProgramm(handle: DrawHandle, file: PseudoFile, args: Args) {
    switch (args.action) {
        case "Run":
            {
                const { path, exitOnHalt } = args.arguments as Action["Run"]
                run(file, handle, exitOnHalt)
            }
            break
        case "Emit":
            {
                const { path } = args.arguments as Action["Emit"]
                throw new Error("NOT implemented atm!")
                //  emit(path.as_deref()),
            }
            break

        case "Json":
            {
                const { path } = args.arguments as Action["Json"]
                throw new Error("NOT implemented atm!")
                //print_json(path.as_deref()),
            }
            break
        default:
            throw new Error(`unimplemented Action: ${args.action}!`)
    }
}

export enum Constant {
    Register = 0,
    Address,
    UnsignedInteger,
}

export type PossibleConstants = Register | Address | number

/* 
fn print_json(output_filename: Option<&Path>) -> Result<(), Box<dyn Error>> {
    #[derive(Serialize)]
    struct JsonInfo {
        opcodes: HashMap<&'static str, OpcodeDescription>,
        constants: HashMap<&'static str, Constant>,
        flags: HashMap<&'static str, usize>,
    }

    let json_info = JsonInfo {
        opcodes: Opcode::as_hashmap(),
        constants: HashMap::from([
            (
                "ENTRY_POINT",
                Constant::Address(address_constants::ENTRY_POINT),
            ),
            (
                "NUM_REGISTERS",
                Constant::UnsignedInteger(NUM_REGISTERS as _),
            ),
            ("FLAGS", Constant::Register(Processor::FLAGS.0.into())),
            (
                "INSTRUCTION_POINTER",
                Constant::Register(Processor::INSTRUCTION_POINTER.0.into()),
            ),
            (
                "STACK_POINTER",
                Constant::Register(Processor::STACK_POINTER.0.into()),
            ),
            (
                "STACK_START",
                Constant::Address(address_constants::STACK_START),
            ),
            (
                "STACK_SIZE",
                Constant::UnsignedInteger(address_constants::STACK_SIZE as _),
            ),
            (
                "FIRST_FRAMEBUFFER_START",
                Constant::Address(address_constants::FIRST_FRAMEBUFFER_START),
            ),
            (
                "SECOND_FRAMEBUFFER_START",
                Constant::Address(address_constants::SECOND_FRAMEBUFFER_START),
            ),
            (
                "FRAMEBUFFER_SIZE",
                Constant::UnsignedInteger(address_constants::FRAMEBUFFER_SIZE as _),
            ),
            (
                "TERMINAL_WIDTH",
                Constant::UnsignedInteger(terminal::WIDTH as _),
            ),
            (
                "TERMINAL_HEIGHT",
                Constant::UnsignedInteger(terminal::HEIGHT as _),
            ),
            (
                "TERMINAL_BUFFER_SIZE",
                Constant::UnsignedInteger(address_constants::TERMINAL_BUFFER_SIZE as _),
            ),
            (
                "TERMINAL_BUFFER_START",
                Constant::Address(address_constants::TERMINAL_BUFFER_START),
            ),
            (
                "TERMINAL_BUFFER_END",
                Constant::Address(address_constants::TERMINAL_BUFFER_END),
            ),
            (
                "TERMINAL_CURSOR_POINTER",
                Constant::Address(address_constants::TERMINAL_CURSOR_POINTER),
            ),
            (
                "TERMINAL_CURSOR_MODE",
                Constant::Address(address_constants::TERMINAL_CURSOR_MODE),
            ),
            (
                "TERMINAL_CURSOR_MODE_BLINKING",
                Constant::UnsignedInteger(CursorMode::Blinking as _),
            ),
            (
                "TERMINAL_CURSOR_MODE_VISIBLE",
                Constant::UnsignedInteger(CursorMode::Visible as _),
            ),
            (
                "TERMINAL_CURSOR_MODE_INVISIBLE",
                Constant::UnsignedInteger(CursorMode::Invisible as _),
            ),
            (
                "DISPLAY_WIDTH",
                Constant::UnsignedInteger(display::WIDTH as _),
            ),
            (
                "DISPLAY_HEIGHT",
                Constant::UnsignedInteger(display::HEIGHT as _),
            ),
        ]),
        flags: Flag::as_hashmap(),
    };
    let json_string = serde_json::to_string_pretty(&json_info).unwrap();
    match output_filename {
        Some(filename) => std::fs::write(filename, &json_string)?,
        None => println!("{json_string}"),
    }

    Ok(())
} */
/* 
fn emit(output_filename: Option<&Path>) -> Result<(), Box<dyn Error>> {
    let opcodes = &[
        Opcode::MoveRegisterImmediate {
            // starting color
            register: 0.into(),
            immediate: 0xFF,
        },
        Opcode::MoveRegisterImmediate {
            // num iterations
            register: 42.into(),
            immediate: (display::WIDTH * display::HEIGHT) as Word,
        },
        // outer loop start
        Opcode::MoveRegisterImmediate {
            // current loop counter
            register: 1.into(),
            immediate: 0,
        },
        Opcode::AddTargetSourceImmediate {
            // current color
            target: 0.into(),
            source: 0.into(),
            immediate: 0x200,
        },
        Opcode::MoveRegisterImmediate {
            register: 2.into(),
            immediate: address_constants::FIRST_FRAMEBUFFER_START,
        },
        // inner loop start
        Opcode::MovePointerSource {
            pointer: 2.into(),
            source: 0.into(),
        },
        Opcode::AddTargetSourceImmediate {
            target: 2.into(),
            source: 2.into(),
            immediate: Word::SIZE as Word,
        },
        Opcode::AddTargetSourceImmediate {
            target: 1.into(),
            source: 1.into(),
            immediate: 1,
        },
        Opcode::CompareTargetLhsRhs {
            target: 10.into(),
            lhs: 1.into(),
            rhs: 42.into(),
        },
        Opcode::JumpImmediateIfLessThan {
            comparison: 10.into(),
            immediate: address_constants::ENTRY_POINT + 5 * Instruction::SIZE as Word,
        },
        Opcode::JumpImmediate {
            immediate: address_constants::ENTRY_POINT + 2 * Instruction::SIZE as Word,
        },
    ];
    let machine_code = opcodes_to_machine_code(opcodes);
    match output_filename {
        Some(filename) => save_opcodes_as_machine_code(opcodes, filename)?,
        None => io::Write::write_all(&mut std::io::stdout(), &machine_code)?,
    }

    Ok(())
}
 */

export function run(
    file: PseudoFile,
    handle: DrawHandle,
    exitOnHalt: boolean
): void {
    // TODO init canvas here instead of earlier
    /*     let (raylib_handle, raylib_thread) = raylib::init()
        .size(SCREEN_SIZE.width, SCREEN_SIZE.height)
        .title("Backseater")
        .build(); */

    const listenDiv = handle[0].parentElement ?? handle[1].parentElement
    if (listenDiv === null) {
        throw new Error(
            "The two canvas have no parent element, but the keyboard requires such an element!"
        )
    }

    const timer = new Timer(new Date())
    const periphery = new Periphery(
        timer,
        new Keyboard(listenDiv),
        new Display(handle),
        new Cursor(true, new Date().getTime() + Cursor.TOGGLE_INTERVAL)
    )

    let machine = new Machine(periphery, exitOnHalt)

    loadRom(machine, file)
    machine.generateInstructionCache()

    // TODO load font here, instead of previously
    /*    #[cfg(feature = "graphics")]
    let font = raylib_handle
        .borrow_mut()
        .load_font(&raylib_thread, "./resources/CozetteVector.ttf")?; */

    let timeMeasurements: TimeMeasurements = {
        nextRenderTime: timer.getMsSinceEpoch(),
        lastCycleCount: 0n,
        lastRenderTime: 0n,
        clockFrequencyAccumulator: 0n,
        nextClockFrequencyRender: timer.getMsSinceEpoch() + 1000n,
        numClockFrequencyAccumulations: 0n,
        clockFrequencyAverage: 0n,
    }

    let stopVM = false

    while (!stopVM) {
        const currentTime = timer.getMsSinceEpoch()
        renderIfNeeded(currentTime, timeMeasurements, handle, machine)

        const [averageFrequency, notRender] = [
            timeMeasurements.clockFrequencyAverage,
            currentTime > timeMeasurements.nextRenderTime,
        ]

        let numCycles: u64

        if (notRender) {
            timeMeasurements.nextRenderTime = currentTime
            numCycles = 0n
        } else if (averageFrequency === 0n) {
            numCycles = 10_000n
        } else {
            const remainingMsUntilNextRender =
                timeMeasurements.nextRenderTime - currentTime
            const cycleDuration = 1000n / timeMeasurements.clockFrequencyAverage
            numCycles = remainingMsUntilNextRender / BigInt(cycleDuration) - 10n
        }

        for (let i = 0; i < numCycles; ++i) {
            executeNextInstruction(machine)
        }
    }
}

function loadRom(machine: Machine, file: PseudoFile): void {
    writeBuffer(file.content, machine)
}

export function writeBuffer(content: Uint8ClampedArray, machine: Machine) {
    if (Memory.SIZE - ENTRY_POINT < content.length) {
        throw new Error(`File size ${content.length} too big`)
    }
    if (content.length % Word.SIZE != 0) {
        throw new Error(`Filesize must be divisible by ${Word.SIZE}`)
    }
    machine.memory.data.set(content, ENTRY_POINT)
}

function executeNextInstruction(machine: Machine) {
    if (!machine.isHalted) {
        machine.executeNextInstruction()
    }
}

function opcodesToMachineCode(instructions: OpCode[]): Uint8ClampedArray[] {
    return instructions.map((opcode) => {
        const array: Uint8ClampedArray = new Uint8ClampedArray(
            new ArrayBuffer(Instruction.SIZE)
        )
        Instruction.saveAsBEBytes(array, 0, opcode.asInstruction())
        return array
    })
}

export function saveOpcodesAsMachineCode(
    instructions: OpCode[],
    filename: string
) {
    const fileContents = opcodesToMachineCode(instructions)
    const url = URL.createObjectURL(new Blob(fileContents))

    // TODO solve with link, so that it had a default name!
    window.open(url, "_blank")
}

export interface TimeMeasurements {
    nextRenderTime: u64
    lastCycleCount: u64
    lastRenderTime: u64
    clockFrequencyAccumulator: u64
    nextClockFrequencyRender: u64
    numClockFrequencyAccumulations: u64
    clockFrequencyAverage: u64
}

function renderIfNeeded(
    currentTime: u64,
    timeMeasurements: TimeMeasurements,
    handle: DrawHandle,
    machine: Machine
) {
    if (currentTime >= timeMeasurements.nextRenderTime) {
        timeMeasurements.nextRenderTime += 1000n / BigInt(TARGET_FPS)

        render(handle, machine)

        let currentCycleCount = machine.processor.getCycleCount()
        if (currentTime != timeMeasurements.lastRenderTime) {
            calculateClockFrequency(
                currentTime,
                timeMeasurements,
                currentCycleCount
            )
            drawClockFrequency(timeMeasurements, handle, machine)
        }
        timeMeasurements.lastRenderTime = currentTime
        timeMeasurements.lastCycleCount = currentCycleCount
    }
}

function render(handle: DrawHandle, machine: Machine) {
    const ctx = machine.periphery.display.getCurrentCtx(handle)
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, terminal.WIDTH, terminal.HEIGHT)

    machine.render(handle)
    // TODO implement fps display

    /* var stats = new Stats();
    stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.dom ); */

    // draw_handle.draw_fps(SCREEN_SIZE.width - 150, 10);
}

function calculateClockFrequency(
    currentTime: u64,
    timeMeasurements: TimeMeasurements,
    currentCycleCount: u64
) {
    let timeSinceLastRender = currentTime - timeMeasurements.lastRenderTime
    let cyclesSinceLastRender =
        currentCycleCount - timeMeasurements.lastCycleCount
    let clockFrequency = (1000n * cyclesSinceLastRender) / timeSinceLastRender
    timeMeasurements.clockFrequencyAccumulator += clockFrequency
    timeMeasurements.numClockFrequencyAccumulations += 1n
    if (currentTime >= timeMeasurements.nextClockFrequencyRender) {
        timeMeasurements.clockFrequencyAverage =
            timeMeasurements.clockFrequencyAccumulator /
            timeMeasurements.numClockFrequencyAccumulations
        timeMeasurements.nextClockFrequencyRender = currentTime + 1000n
        timeMeasurements.clockFrequencyAccumulator = 0n
        timeMeasurements.numClockFrequencyAccumulations = 0n
    }
}

function drawClockFrequency(
    timeMeasurements: TimeMeasurements,
    handle: DrawHandle,
    machine: Machine
) {
    const ctx = machine.periphery.display.getCurrentCtx(handle)

    ctx.fillStyle = "white"

    // doesn't affect anything
    // ctx.lineWidth  = 5.0;

    ctx.fillText(
        `${timeMeasurements.clockFrequencyAverage / 1000n} kHz`,
        SCREEN_SIZE.width - 200.0,
        100.0
    )
}
