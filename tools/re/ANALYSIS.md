# Rampage (Bally Midway, 1986) ROM 분석 노트

> 이 문서에 나오는 `z80_main.bin`, `z80_disasm.txt`, 덤프, WAV 같은 산출물은 ROM에서 나온 데이터라 저장소에 넣지 않았습니다. 이 폴더의 스크립트로 다시 만들 수 있습니다.

ROM 세트: `rampage` Rev 3 (8/27/86), 사운드 Rev 2. MAME 0.289 `-verifyroms`로 검증했습니다.

## 하드웨어 (MAME `bally/mcr3.cpp`, MCR 모노보드 + Sounds Good)

- 메인 CPU: Z80. `pro0`(0x0000) + `pro1`(0x8000)을 합쳐 64KB 주소 공간을 만듭니다(`z80_main.bin`).
- RAM: NVRAM `E000-E7FF`, 스프라이트 RAM `E800-E9FF`, 팔레트 `EC00-EC7F`(9비트 RGB 64색), 비디오 RAM `F000-F7FF`(32×30 타일, 2바이트).
- 사운드: Sounds Good 보드(68000 + 10비트 DAC). `u7/u17`, `u8/u18`을 바이트 인터리브해 128KB 이미지를 만듭니다(`m68k_sound.bin`, 리셋 벡터 SP=0x070800, PC=0x26E4).
- 그래픽: 배경 8×8 4bpp 1024개(`bg-0/1`, 반전 저장, 2배 확대해 16×16으로 표시), 스프라이트 32×32 4bpp 512개(`fg-0..3`).

## 분석 도구

- **rea**(`rea-agents` 6.7.0): `rea execute-rizin-command`로 Rizin 백엔드를 써서 Z80 코드를 분석했습니다(`rea_rz.sh` 래퍼). 함수 543개를 찾았고, 디스어셈블 결과는 `z80_disasm.txt`, `z80_linear.txt`에 있습니다. Ghidra 12.1.4(JDK 21)도 rea provider로 연결해 두었습니다(`rea doctor`: ghidra healthy).
- **MAME 0.289** + Lua(`mame_lua/`): 사운드 녹음, 봇 플레이, 팔레트·RAM 덤프.
- Python(`gfxdecode.py`, `render_dump.py`): MAME 레이아웃 정의대로 타일과 스프라이트를 디코딩했습니다. 덤프로 재구성한 화면이 MAME 스냅샷과 일치하는지 확인했습니다(`gfx/compare.png`).

## 주요 발견

### 사운드 시스템
- `PlaySound(C)` = `0x6501`. `[E61B]`(전역 정지 플래그)가 0이 아니면 바로 리턴하고, 아니면 큐 `E61E[E61C]`에 넣습니다(최대 6개). `RST 20h`(→`0x654D`)는 이 함수를 부르는 단축 호출입니다.
- 송신 루틴은 `0x056A`이며 `[E676]`이 0이면 사운드가 꺼집니다. 8비트 코드를 니블 두 개로 나눠 포트 6에 씁니다:
  `(lo<<1)|0x20` → `|1` 스트로브 → `(hi>>3)|0x21` → `&~1`. 포트 6의 비트 5는 사운드 보드 리셋입니다.
- 유효 코드는 `0x10–0x72`입니다. `0x00`은 정지, `0x01–0x0F`는 제어 코드(예: `0x01` 헬기 루프 정지, `0x02` 엔진 루프 정지)로 보입니다.
- 녹음 방법(`rec_ingame.lua`): 코인을 넣고 게임을 시작한 뒤 `0x6501/0x6506`을 `RET`로 런타임 패치해 게임이 내는 소리를 막습니다. 그다음 큐에 `[0x00, code]`를 직접 넣고 `-wavwrite`로 녹음합니다. 코드별로 잘라 DC를 제거하고 정규화했으며, 자기상관으로 루프 주기를 찾았습니다(예: `0x68` 3.846초, `0x14` 1.139초).
- 이벤트 매핑은 봇 플레이 로그(`bot_log*.txt`)에서 코드 발생 시점·간격·연쇄를 스냅샷과 대조해 추정했습니다. 예: `10/01` 헬기 루프 시작/정지, `11/02` 엔진 루프, `37→02→65` 차량 파괴, `4E→4C` 붕괴 시작→붕괴, `5C` 괴물→인간 변신, `6A` 코인, `68` 시작 징글, `1B` 뉴스 음악. 나머지 코드는 추정이며 사운드 테스트 화면에서 확인할 수 있습니다.

### 게임 데이터
- 도시 목록 `0x9610–0x99AB`: 85개, `#n` 접두어는 가운데 정렬 칸 수입니다.
- 뉴스 헤드라인·힌트 `0x69AC–0x6D99`: 줄 구분자 `/`.
- 아이템 설명 `0xB2BB`: MILK, TURKEY, HOT TOAST / CACTUS, POISON, TOASTER / MONEY BAG, FLOWER POT, T.V. OFF.
- `0x95AA` 포인터 테이블 → 도로/지면 타일 행 데이터(`0x8CA6`에서 VRAM `F640`으로 복사).
- 랜덤 포효 테이블 `0x6528`(코드 `0x68/0x1F/0x1B/0x22/0x1E`), `0x6516`에서 사용.
- 크레딧: Artist Brian Colin, Sounds Michael Bartlow, Software Jeff Nauman.
- 테스트 메뉴 문자열 "V.3 8-27-86", 난이도 DIP(Easy/Normal/Hard/Free Play).

### 그래픽
- 스프라이트 플래그: d0–d1 색 뱅크(반전), d3 코드 비트 8, d4 HFLIP, d5 VFLIP. 위치는 `sx=(x-3)*2`, `sy=(241-y)*2`(인터레이스).
- 사용 중인 스프라이트 153종을 덤프에서 확인했습니다. 전체 시트는 `gfx/sprites_sheet.png`에 있습니다. 괴물 3종의 파트 분할 스프라이트, 군인, 헬기, 탱크, 경찰차, 택시, 픽업, 보트, 비행선, 기차, 음식·위험 아이템, 간판(DAN'S DELI, COLD BEER, EATS, DRUG), 점수(50/100/350/500/1000)가 있습니다.

## 재현

```bash
# MAME (tools/mame) — 사운드 녹음 배치
SFIRST=16 SLAST=31 SGAP=5 mame rampage -nothrottle -video none -sound none \
  -wavwrite snd/batch_16.wav -autoboot_script mame_lua/rec_ingame.lua
# 봇 플레이 + 사운드 코드 로그
SEED=1 DUR=600 mame rampage ... -autoboot_script mame_lua/bot_play.lua
# 그래픽 디코딩
python gfxdecode.py && python render_dump.py dumps/d020.bin out.png
```
