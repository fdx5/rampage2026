-- Capture palette writes (9-bit) and periodically dump video/sprite RAM with a snapshot.
local mem = manager.machine.devices[":maincpu"].spaces["program"]
PAL = {}
for i = 0, 63 do PAL[i] = 0 end
PTAP = mem:install_write_tap(0xec00, 0xefff, "paltap", function(offset, data, mask)
  local o = offset & 0x7f
  PAL[o >> 1] = (data & 0xff) | ((o & 1) << 8)
end)
local n = 0
local OUT = "I:/ai_root/rampage/analysis/dumps/"
local every = tonumber(os.getenv("EVERY") or "5")
local nexts = 9
dofile("I:/ai_root/rampage/analysis/mame_lua/bot_core.lua")
SUB2 = emu.add_machine_frame_notifier(function()
  local t = manager.machine.time:as_double()
  if t >= nexts then
    nexts = t + every
    local f = assert(io.open(string.format("%sd%03d.bin", OUT, n), "wb"))
    local parts = {}
    for i = 0, 63 do parts[#parts+1] = string.char(PAL[i] & 0xff, PAL[i] >> 8) end
    for a = 0xe800, 0xe9ff do parts[#parts+1] = string.char(mem:read_u8(a)) end
    for a = 0xf000, 0xf7ff do parts[#parts+1] = string.char(mem:read_u8(a)) end
    f:write(table.concat(parts)); f:close()
    manager.machine.video:snapshot()
    n = n + 1
  end
end)
