-- Start a real game (coin + jump), then inject every sound code into the game's
-- own sound queue while the monster stands idle. Logs injection times.
local mem = manager.machine.devices[":maincpu"].spaces["program"]
local ports = manager.machine.ioport.ports
local function press(port, mask, on) ports[port]:field(mask):set_value(on and 1 or 0) end
LOG = io.open("I:/ai_root/rampage/analysis/snd/log_" .. (os.getenv("SFIRST") or "0") .. ".txt", "w")
FIRST = tonumber(os.getenv("SFIRST") or "0"); LAST = tonumber(os.getenv("SLAST") or "127"); GAP = tonumber(os.getenv("SGAP") or "4")
START = 20.0
local io = manager.machine.devices[":maincpu"].spaces["io"]
TAPLOG = io.open and nil
TAP = io:install_write_tap(0x06, 0x06, "sndtap", function(offset, data, mask)
  if os.getenv("TAPDBG") then print(string.format("%.3f port6 <- %02x  q=%d cur=%02x", manager.machine.time:as_double(), data & 0xff, mem:read_u8(0xe61c), mem:read_u8(0xe61d))) end
end)
local code, next_t, snaps = FIRST, START, 0
SUB = emu.add_machine_frame_notifier(function()
  local t = manager.machine.time:as_double()
  press(":MONO.IP0", 0x01, t > 6.0 and t < 6.3)            -- coin
  press(":MONO.IP1", 0x20, t > 8.0 and t < 8.3)            -- P1 jump = start
  press(":MONO.IP1", 0x10, t > 8.6 and t < 8.9)
  if os.getenv("SNAP") and t > 10 and snaps < 6 and t > 10 + snaps * 1.5 then
    manager.machine.video:snapshot(); snaps = snaps + 1
  end
  if t > 12 and not PATCHED then                       -- block game-issued sounds: PlaySound -> RET
    local rom = manager.machine.memory.regions[":maincpu"]
    rom:write_u8(0x6501, 0xc9); rom:write_u8(0x6506, 0xc9); PATCHED = true
  end
  if t >= next_t then
    if code > LAST then LOG:close(); manager.machine:exit(); return end
    mem:write_u8(0xe61e, 0x00); mem:write_u8(0xe61f, code); mem:write_u8(0xe61c, 2)
    LOG:write(string.format("%d %.4f\n", code, t)); LOG:flush()
    code = code + 1; next_t = t + GAP
  end
end)
