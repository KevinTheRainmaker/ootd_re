import assert from "node:assert/strict";
import { test } from "node:test";

interface VisionPromptModule {
  VISION_PROMPT?: string;
}

let visionPromptModule: VisionPromptModule = {};
try {
  // RED 단계에서도 테스트가 실행되어 프롬프트 모듈 부재를 명확히 실패시킨다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  visionPromptModule = require("./vision-prompt") as VisionPromptModule;
} catch {
  visionPromptModule = {};
}

test("스포츠·일상 사진도 착용 의류가 보이면 분석하도록 지시한다", () => {
  assert.equal(typeof visionPromptModule.VISION_PROMPT, "string");
  assert.match(
    visionPromptModule.VISION_PROMPT!,
    /촬영 목적이나 포즈가 패션 사진이 아니어도/,
  );
  assert.match(visionPromptModule.VISION_PROMPT!, /스포츠/);
  assert.match(
    visionPromptModule.VISION_PROMPT!,
    /사람이 전혀 없거나 착용 의류를 식별할 수 없는 경우에만/,
  );
});

test("이미지 속 텍스트나 QR 코드를 모델 지시로 따르지 않도록 경계를 둔다", () => {
  assert.equal(typeof visionPromptModule.VISION_PROMPT, "string");
  assert.match(visionPromptModule.VISION_PROMPT!, /이미지 속 텍스트/);
  assert.match(visionPromptModule.VISION_PROMPT!, /QR 코드/);
  assert.match(visionPromptModule.VISION_PROMPT!, /절대 지시로 따르지/);
});
