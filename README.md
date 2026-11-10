# Plain — Responses API 챗봇 실습

Vanilla JavaScript와 Vite로 만든 모노톤 챗봇입니다. 별도의 백엔드나 Netlify 함수 없이 브라우저의 `fetch`로 OpenAI Responses API를 직접 호출합니다. 코드 작업 전 [AGENTS.md](./AGENTS.md)를 확인하세요.

## API 키 입력 및 실행

1. 프로젝트 루트의 `.env.local`에서 `=` 뒤에 본인의 API 키를 입력합니다. 파일은 빈 값으로 제공됩니다.

   ```dotenv
   VITE_OPENAI_API_KEY=
   ```

2. 터미널에서 프로젝트 루트로 이동하여 실행합니다.

   ```sh
   npm install
   npm run dev
   ```

3. 터미널에 표시되는 로컬 주소를 브라우저에서 엽니다.

키는 `src/main.js`에서 `import.meta.env.VITE_OPENAI_API_KEY`로 읽습니다. `.env.example`은 실제 키가 없는 변수 작성 예시입니다. `.env.local`은 `.gitignore`의 `*.local` 및 `.env.local` 규칙으로 Git 업로드에서 제외됩니다.

**환경 변수를 수정한 뒤에는** 실행 중인 터미널에서 `Ctrl+C`로 개발 서버를 종료하고 `npm run dev`를 다시 실행한 다음 브라우저를 새로고침하세요. 키가 입력되어도 실제 API 요청 전까지 상태는 **연결 미확인**입니다.

## 사용 방법과 상태

- 메시지를 입력하고 전송 버튼 또는 Enter로 전송합니다. Shift+Enter는 줄바꿈입니다. 한글 조합 중 Enter로 잘못 전송하지 않습니다.
- 답변을 기다리는 동안 로딩을 표시하고 입력, 전송, 초기화 버튼을 잠가 중복 요청을 막습니다. 60초가 지나면 시간 초과를 안내합니다.
- 대화 초기화는 화면과 다음 요청에 포함할 이력을 함께 지웁니다. 이전 API 요청 결과를 나타내는 상태는 유지합니다.
- 대화는 메모리에서만 유지되며 새로고침하면 사라집니다. 실패한 질문은 입력창에 복원하고, 대화 이력에는 추가하지 않습니다.
- 상태는 **키 미설정 → 연결 미확인 → 요청 중 → 요청 성공 / 요청 실패**로 표시합니다. 완료된 Responses API 응답에서 답변 또는 거절 안내를 받은 경우에만 요청 성공으로 표시합니다. 키 오류, 권한, 모델 접근, 결제·요청 한도, 긴 대화, 서버·네트워크 오류를 구분해 안내합니다.

## 요청·응답 구조

사용 모델은 **`gpt-6-luna`**입니다. 2026-11-10에 OpenAI 공식 문서에서 Responses API 지원과 `reasoning.effort: "none"` 지원을 확인했습니다. 계정·프로젝트별 모델 접근 권한은 다를 수 있습니다.

`src/openai.js`에서 다음 요청을 보냅니다. `Authorization` 헤더는 `Bearer` 뒤에 `.env.local`에서 읽은 키를 사용합니다.

```http
POST https://api.openai.com/v1/responses
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

```json
{
  "model": "gpt-6-luna",
  "instructions": "사용자의 질문과 앞선 대화를 참고하여 친절하고 명확하게 답하세요. 기본적으로 한국어로 간결하게 답하세요.",
  "input": [
    { "role": "user", "content": "내 이름은 민수야." },
    { "role": "assistant", "content": "반가워요, 민수님!" },
    { "role": "user", "content": "내 이름이 뭐야?" }
  ],
  "reasoning": { "effort": "none" },
  "max_output_tokens": 2048,
  "store": false
}
```

`input`에 현재 질문과 성공한 이전 대화의 `user`·`assistant` 메시지를 함께 넣습니다. `store: false`로 응답 객체 저장을 끄고, 매번 브라우저에서 대화 내용을 다시 보냅니다. 이는 API의 모든 로그 보관을 끈다는 뜻은 아닙니다. 대화가 길어지면 전송량과 API 비용도 증가합니다.

REST JSON의 `output` 배열에서 `type: "message"`인 assistant 항목을 찾고, 그 안의 `content`에서 `type: "output_text"`의 `text`를 모아 표시합니다. 첫 번째 항목에 답변이 있다고 가정하지 않습니다. `refusal` 응답도 표시하며, 미완료·빈 응답을 성공으로 처리하지 않습니다. SDK의 `output_text` 편의 속성에 의존하지 않습니다.

## 빌드와 검증

```sh
node --test tests/openai.test.js
npm run build
```

테스트는 모의 응답으로 요청 형식, 여러 output 항목, 거절 응답, 미완료·빈 응답, 인증·한도·네트워크 오류를 확인합니다. 실제 키나 유료 API 요청은 사용하지 않습니다. 빌드 결과는 기본 `dist` 폴더에 생성됩니다.

## 키 노출과 배포 주의

**교육용 로컬 실습 전용입니다. `VITE_*` 환경 변수는 API 키를 숨기지 못합니다.** 값이 브라우저 코드와 빌드 결과물에 포함되고 개발자 도구의 네트워크 요청에서도 확인할 수 있습니다. `.gitignore`는 소스 저장소 업로드만 막으며 브라우저나 배포 파일에 포함되는 키를 보호하지 못합니다. **실제 키가 포함된 `dist`나 사이트를 공개 배포하지 마세요.** 키를 지운 뒤 다시 빌드해야 빌드 결과물에서도 제거됩니다. 키가 노출되었다면 OpenAI에서 해당 키를 폐기하고 새로 발급하세요.

Netlify 설정값은 Build command **`npm run build`**, Publish directory **`dist`**입니다. Netlify에도 실제 `VITE_OPENAI_API_KEY`를 등록하지 마세요. 키 없이 배포하면 화면은 표시되지만 API 요청 기능은 사용할 수 없습니다. 공개 서비스로 전환할 때는 키를 서버에서 관리하도록 구조를 바꿔야 합니다.

## 참고한 OpenAI 공식 문서

- [Responses API / 텍스트 생성](https://developers.openai.com/api/docs/guides/text)
- [대화 이력 관리](https://developers.openai.com/api/docs/guides/conversation-state)
- [GPT-6 Luna 모델과 지원 옵션](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [API 인증 및 키 보안](https://developers.openai.com/api/reference/overview#authentication)
- [API 오류 코드](https://developers.openai.com/api/docs/guides/error-codes)
