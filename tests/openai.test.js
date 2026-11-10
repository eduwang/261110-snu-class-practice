import test from 'node:test'
import assert from 'node:assert/strict'
import { MODEL, requestReply } from '../src/openai.js'

const input = [{ role: 'user', content: '안녕' }]
const message = (text) => ({
  type: 'message',
  role: 'assistant',
  content: [{ type: 'output_text', text }],
})
const completed = (output) => ({ status: 'completed', output })

test('Responses REST 요청에 모델, Bearer 인증, 전체 대화 이력을 보낸다', async (t) => {
  const history = [
    { role: 'user', content: '내 이름은 민수야.' },
    { role: 'assistant', content: '반가워요, 민수님!' },
    { role: 'user', content: '내 이름이 뭐야?' },
  ]
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.equal(options.headers['Content-Type'], 'application/json')
    const body = JSON.parse(options.body)
    assert.equal(body.model, MODEL)
    assert.deepEqual(body.input, history)
    assert.equal(body.store, false)
    assert.deepEqual(body.reasoning, { effort: 'none' })
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json(completed([message('민수님이에요.')]))
  })
  assert.equal(await requestReply('test-key', history), '민수님이에요.')
})

test('reasoning 항목을 건너뛰고 여러 메시지와 텍스트 조각을 읽는다', async (t) => {
  const output = [
    { type: 'reasoning', summary: [] },
    { type: 'message', role: 'assistant', content: [
      { type: 'output_text', text: '첫 문장' },
      { type: 'output_text', text: '둘째 문장' },
    ] },
    message('셋째 문장'),
  ]
  t.mock.method(globalThis, 'fetch', async () => Response.json(completed(output)))
  assert.equal(await requestReply('test-key', input), '첫 문장\n둘째 문장\n셋째 문장')
})

test('완료된 거절 응답도 표시할 수 있다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(completed([
    { type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: '이 요청은 도와드릴 수 없습니다.' }] },
  ])))
  assert.equal(await requestReply('test-key', input), '이 요청은 도와드릴 수 없습니다.')
})

for (const [name, data, expected] of [
  ['출력 제한', { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [message('일부 답변')] }, /출력 길이 제한/],
  ['그 외 미완료', { status: 'incomplete', incomplete_details: { reason: 'content_filter' } }, /완료되지/],
  ['실패 상태', { status: 'failed', error: { code: 'server_error' } }, /완료된 응답/],
  ['빈 답변', completed([]), /표시할 텍스트/],
  ['잘못된 응답', null, /완료된 응답/],
]) {
  test(`${name}를 성공으로 처리하지 않는다`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(data))
    await assert.rejects(requestReply('test-key', input), expected)
  })
}

for (const [status, code, expected] of [
  [401, 'invalid_api_key', /API 키가 올바르지/],
  [403, null, /권한/],
  [404, 'model_not_found', /모델/],
  [429, 'insufficient_quota', /크레딧/],
  [429, 'project_spend_limit_exceeded', /결제/],
  [429, 'rate_limit_exceeded', /잠시 기다린/],
  [400, 'context_length_exceeded', /대화가 너무 길어/],
  [400, null, /HTTP 400/],
  [503, 'server_is_overloaded', /서버/],
]) {
  test(`HTTP ${status} / ${code} 오류를 안내하고 키 원문을 노출하지 않는다`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({
      error: { code, message: 'Incorrect API key provided: secret-test-key' },
    }, { status }))
    await assert.rejects(requestReply('test-key', input), (error) => {
      assert.match(error.message, expected)
      assert.ok(!error.message.includes('secret-test-key'))
      return true
    })
  })
}

test('JSON이 아닌 서버 오류도 HTTP 상태에 따라 안내한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 502 }))
  await assert.rejects(requestReply('test-key', input), /서버/)
})

test('연결 실패와 시간 초과를 구분한다', async (t) => {
  const mockFetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(requestReply('test-key', input), /인터넷 연결/)
  mockFetch.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError') })
  await assert.rejects(requestReply('test-key', input), /60초/)
})
