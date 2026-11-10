export const MODEL = 'gpt-6-luna'

function apiErrorMessage(status, code) {
  if (status === 401) return 'API 키가 올바르지 않거나 만료되었습니다. .env.local의 키를 확인하고 개발 서버를 재시작해 주세요.'
  if (status === 403) return '이 요청을 사용할 권한이 없습니다. API 프로젝트 권한과 지원 지역을 확인해 주세요.'
  if (status === 404) return `${MODEL} 모델을 찾을 수 없거나 접근 권한이 없습니다. OpenAI 프로젝트의 모델 사용 권한을 확인해 주세요.`
  if (status === 429) {
    if (['insufficient_quota', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'].includes(code)) {
      return 'API 크레딧이 부족하거나 사용 한도에 도달했습니다. OpenAI API 결제와 프로젝트 한도를 확인해 주세요.'
    }
    return '요청 한도에 도달했습니다. 잠시 기다린 뒤 다시 전송해 주세요.'
  }
  if (code === 'context_length_exceeded') return '대화가 너무 길어졌습니다. 대화를 초기화한 뒤 다시 질문해 주세요.'
  if (status >= 500) return 'OpenAI 서버에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  return `요청을 처리하지 못했습니다 (HTTP ${status}). 질문 길이와 요청 설정을 확인해 주세요.`
}

export async function requestReply(apiKey, input) {
  let response

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: '사용자의 질문과 앞선 대화를 참고하여 친절하고 명확하게 답하세요. 기본적으로 한국어로 간결하게 답하세요.',
        input,
        reasoning: { effort: 'none' },
        max_output_tokens: 2048,
        store: false,
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('응답 대기 시간이 60초를 초과했습니다. 잠시 후 다시 전송해 주세요.')
    }
    throw new Error('API에 연결하지 못했습니다. 인터넷 연결, 브라우저의 요청 차단(CORS), VPN 또는 방화벽 설정을 확인해 주세요.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // 인증 오류 원문에는 키 일부가 포함될 수 있어 그대로 표시하지 않습니다.
    throw new Error(apiErrorMessage(response.status, data?.error?.code))
  }
  if (data?.status === 'incomplete') {
    throw new Error(data.incomplete_details?.reason === 'max_output_tokens'
      ? '답변이 출력 길이 제한에 도달했습니다. 질문을 나누거나 짧은 답변을 요청해 주세요.'
      : '답변이 완료되지 않았습니다. 질문을 바꾸어 다시 시도해 주세요.')
  }
  if (data?.status !== 'completed' || !Array.isArray(data.output) || data.error) {
    throw new Error('완료된 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }

  // REST 응답에는 SDK의 output_text 편의 속성이 없으므로 output을 순회합니다.
  const content = data.output
    .filter((item) => item.type === 'message' && item.role === 'assistant')
    .flatMap((item) => item.content ?? [])
  const reply = content
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('\n')
    .trim()
  const refusal = content
    .filter((part) => part.type === 'refusal')
    .map((part) => part.refusal)
    .join('\n')
    .trim()

  if (!reply && !refusal) throw new Error('응답에 표시할 텍스트가 없습니다. 질문을 바꾸어 다시 시도해 주세요.')
  return reply || refusal
}
