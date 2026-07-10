# BattleBlock Star v3 — 로그라이크 퍼즐 (블록 낙하 + 덱빌딩)

ES modules(`"type": "module"`). i18n 3개국어(ko/en/ja), 게임패드 지원, PWA, GitHub Pages 배포.

## 파일 지도

- `src/game.js` (~2,700줄) — 메인 루프/상태. **큼: Grep으로 위치를 찾아 부분만 읽을 것.**
- `src/board.js`, `src/deck.js`, `src/skills.js`, `src/consumables.js`, `src/progression.js`
- `src/ai.js` — 적 행동 / `src/input.js` — 키보드·게임패드 입력
- `src/renderer.js`, `src/audio.js`, `src/music.js`, `src/sfx.js`
- `src/i18n.js` — 다국어 문자열
- `sw.js` — PWA 캐시 / `test.mjs` — 테스트

## 명령어

- `npm test` — 테스트 (수정 후 실행)
- `npm run serve` — 로컬 서버 (port 5173)

## 규칙

- **UI 문자열은 반드시 i18n.js 경유** (하드코딩 금지). 문자열 추가 시 ko/en/ja 3개 모두 채울 것.
- 컨트롤러 키 라벨은 연결된 패드 기준 자동감지 — input.js의 기존 로직을 따를 것.
- 이 저장소는 과거 `input.js` 중복 const 선언으로 게임 전체 로드가 실패한 전례가 있다 —
  문법검사 훅 결과를 무시하지 말 것.
- SW/캐시/배포/모바일: webgame-ship 스킬 참조.
