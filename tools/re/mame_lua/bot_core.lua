-- Shared bot: coin + start, then random monster actions (George, player 1).
local ports = manager.machine.ioport.ports
local function set(port, mask, on) ports[port]:field(mask):set_value(on and 1 or 0) end
math.randomseed(tonumber(os.getenv("SEED") or "7"))
local act_until, act = 0, {}
local acts = { {r=1}, {l=1}, {r=1}, {j=1,u=1}, {u=1}, {u=1}, {p=1}, {p=1,l=1}, {p=1,r=1}, {d=1}, {p=1,u=1}, {j=1}, {p=1,d=1} }
BOTSUB = emu.add_machine_frame_notifier(function()
  local t = manager.machine.time:as_double()
  set(":MONO.IP0", 0x01, (t > 6.0 and t < 6.3) or (t % 60 > 30 and t % 60 < 30.2))
  local start = (t > 8.0 and t < 8.3) or (t % 60 > 31 and t % 60 < 31.2)
  if t > act_until then act = acts[math.random(#acts)]; act_until = t + 0.15 + math.random() * 0.9 end
  local playing = t > 10
  set(":MONO.IP1", 0x01, playing and act.u)
  set(":MONO.IP1", 0x02, playing and act.r)
  set(":MONO.IP1", 0x04, playing and act.d)
  set(":MONO.IP1", 0x08, playing and act.l)
  set(":MONO.IP1", 0x10, playing and act.p and (math.floor(t * 8) % 2 == 0))
  set(":MONO.IP1", 0x20, start or (playing and act.j))
  if t > tonumber(os.getenv("DUR") or "300") then manager.machine:exit() end
end)
