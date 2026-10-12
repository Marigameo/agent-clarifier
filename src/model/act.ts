// Action types (types.ts). Numbers, not strings, in the bundle: 30 words used once or twice each are
// the one thing gzip can't share, and they cost ~320 B (round 22). Always use these names, never a bare
// number. The values only need to be distinct; a unit test checks that.
export const OPEN = 0;
export const STREAM = 1;
export const SELECT = 2;
export const TOGGLE = 3;
export const OTHER_FOCUS = 4;
export const OTHER_INPUT = 5;
export const TEXT_FOCUS = 6;
export const TEXT_INPUT = 7;
export const DELEGATE = 8;
export const NEXT = 9;
export const BACK = 10;
export const GOTO = 11;
export const SKIP = 12;
export const SKIP_ALL = 13;
export const EDIT = 14;
export const START_OVER = 15;
export const UNDO = 16;
export const SUBMIT = 17;
export const UNDO_SUBMIT = 18;
export const SUBMIT_OK = 19;
export const SUBMIT_FAIL = 20;
export const RETRY = 21;
export const MINIMISE = 22;
export const REOPEN = 23;
export const COMPOSE = 24;
export const REPLY = 25;
export const REVISE = 26;
export const EXPIRE = 27;
export const RESET = 28;
export const TOAST_TIMEOUT = 29;
