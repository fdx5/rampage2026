#!/bin/bash
# usage: rea_rz.sh <bin> "<rizin cmds>"  -> prints raw stdout from rea's rizin provider
export PATH=/i/ai_root/tools/rizin/rizin-win-installer-clang_cl-64/bin:$PATH
rea execute-rizin-command "$1" "e scr.color=0; e asm.arch=z80; e asm.bits=8; $2" --format json 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); r=d.get('raw_result') or d.get('result',{}).get('raw_result'); print(r['stdout'] if r else json.dumps(d)[:2000])"
