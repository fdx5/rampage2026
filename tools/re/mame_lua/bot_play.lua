-- Random-ish bot plays George; logs every sound code the game sends (decoded from the
-- two-nibble port 6 protocol) and snapshots the screen shortly after selected codes.
local mem = manager.machine.devices[":maincpu"].spaces["program"]
local io = manager.machine.devices[":maincpu"].spaces["io"]
local ports = manager.machine.ioport.ports
local function set(port, mask, on) ports[port]:field(mask):set_value(on and 1 or 0) end
LOG = io and assert(_G.io.open("I:/ai_root/rampage/analysis/bot_log.txt", "w"))
local nib, phase = 0, 0
local pending_snaps = {}
local seen = {}
print("LOG", LOG)
TAP = io:install_write_tap(0x06, 0x06, "sndtap", function(offset, data, mask)
  data = data & 0xff; if os.getenv("TAPDBG") then print(string.format("%02x ph=%d", data, phase)) end
  if data & 0x20 == 0 then return end
  -- frames: (lo<<1)|0x20, |1 strobe, (hi>>3)|0x21, &~1
  if data & 1 == 0 and phase ~= 3 then nib = (data >> 1) & 0x0f; phase = 1
  elseif data & 1 == 1 and phase == 1 then phase = 2
  elseif data & 1 == 1 and phase == 2 then nib = nib | (((data >> 1) & 0x0f) << 4); phase = 3
  elseif data & 1 == 0 and phase == 3 then
    local t = manager.machine.time:as_double()
    LOG:write(string.format("%.3f %02x\n", t, nib)); LOG:flush(); phase = 0
    seen[nib] = (seen[nib] or 0) + 1
    if os.getenv("SNAPS") and seen[nib] <= 2 then pending_snaps[#pending_snaps+1] = {t + 0.15, nib} end
  else phase = 0 end
end)
math.randomseed(tonumber(os.getenv("SEED") or "7"))
local act_until, act = 0, {}
CUR = {}
local acts = {
  {r=1}, {l=1}, {r=1}, {j=1,u=1}, {u=1}, {u=1}, {p=1}, {p=1,l=1}, {p=1,r=1}, {d=1}, {p=1,u=1}, {j=1}, {p=1,d=1},
}
SUB = emu.add_machine_frame_notifier(function()
  local t = manager.machine.time:as_double()
  set(":MONO.IP0", 0x01, (t > 6.0 and t < 6.3) or (t % 60 > 30 and t % 60 < 30.2))  -- coin (periodic for continues)
  local start = (t > 8.0 and t < 8.3) or (t % 60 > 31 and t % 60 < 31.2)
  if t > act_until then act = acts[math.random(#acts)]; act_until = t + 0.15 + math.random() * 0.9 end
  CUR = act
  local playing = t > 10
  set(":MONO.IP1", 0x01, playing and act.u)
  set(":MONO.IP1", 0x02, playing and act.r)
  set(":MONO.IP1", 0x04, playing and act.d)
  set(":MONO.IP1", 0x08, playing and act.l)
  set(":MONO.IP1", 0x10, playing and act.p and (math.floor(t * 8) % 2 == 0))
  set(":MONO.IP1", 0x20, start or (playing and act.j))
  if #pending_snaps > 0 and t >= pending_snaps[1][1] then
    manager.machine.video:snapshot(); LOG:write(string.format("%.3f SNAP %02x\n", t, pending_snaps[1][2])); table.remove(pending_snaps, 1)
  end
  if t > tonumber(os.getenv("DUR") or "300") then LOG:close(); manager.machine:exit() end
end)
