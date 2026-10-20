-- Inject every sound code into Rampage's own sound queue (0xE61C count / 0xE61E queue)
-- and log the emulated time so the -wavwrite output can be split afterwards.
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]
local log = io.open("I:/ai_root/rampage/analysis/sound_log.txt", "w")
local START = 12.0      -- seconds after boot

FIRST = tonumber(os.getenv("SFIRST") or "0"); LAST = tonumber(os.getenv("SLAST") or "127"); GAP = tonumber(os.getenv("SGAP") or "4")
local code = FIRST
local next_t = START
local sent_stop = false

SUB = emu.add_machine_frame_notifier(function()
  local t = manager.machine.time:as_double()
  mem:write_u8(0xe676, 1)            -- sound enable flag checked at 0x056a
  if t >= next_t then
    if code > LAST then
      log:close(); manager.machine:exit(); return
    end
    mem:write_u8(0xe61e, code)
    mem:write_u8(0xe61c, 1)
    log:write(string.format("%d %.4f\n", code, t)); log:flush()
    code = code + 1
    next_t = t + GAP
    sent_stop = false
  end
end)
