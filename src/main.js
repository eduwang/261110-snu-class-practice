import './style.css'
import { MODEL, requestReply } from './openai.js'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim() ?? ''
const form = document.querySelector('#chat-form')
const input = document.querySelector('#message-input')
const sendButton = document.querySelector('#send-button')
const sendLabel = document.querySelector('#send-label')
const resetButton = document.querySelector('#reset-button')
const messages = document.querySelector('#messages')
const conversation = document.querySelector('#conversation')
const emptyState = document.querySelector('#empty-state')
const loading = document.querySelector('#loading')
const status = document.querySelector('#api-status')
const statusText = document.querySelector('#status-text')
const feedback = document.querySelector('#feedback')
const messageTemplate = document.querySelector('#message-template')

let history = []
let isLoading = false

document.querySelector('#model-name').textContent = MODEL
setStatus(apiKey ? 'unverified' : 'missing', apiKey ? '연결 미확인' : '키 미설정')
feedback.textContent = apiKey
  ? '첫 메시지를 보내면 실제 요청 결과를 확인할 수 있어요.'
  : '.env.local에 VITE_OPENAI_API_KEY를 입력하고 개발 서버를 재시작해 주세요.'

function setStatus(state, text) {
  status.dataset.state = state
  statusText.textContent = text
}

function updateSendButton() {
  sendButton.disabled = isLoading || !apiKey || !input.value.trim()
}

function setLoading(value) {
  isLoading = value
  input.disabled = value
  resetButton.disabled = value
  loading.hidden = !value
  messages.setAttribute('aria-busy', String(value))
  sendLabel.textContent = value ? '대기 중' : '전송'
  updateSendButton()
}

function addMessage(role, text) {
  const fragment = messageTemplate.content.cloneNode(true)
  const message = fragment.querySelector('.message')
  message.classList.add(`message--${role}`)
  fragment.querySelector('.message-avatar').textContent = role === 'user' ? '나' : 'p.'
  fragment.querySelector('.message-author').textContent = role === 'user' ? '나' : 'Plain'
  // API 응답과 사용자 입력은 HTML로 해석하지 않습니다.
  fragment.querySelector('.message-text').textContent = text
  emptyState.hidden = true
  messages.append(fragment)
  conversation.scrollTop = conversation.scrollHeight
  return message
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const text = input.value.trim()
  if (isLoading || !apiKey || !text) return

  const userMessage = { role: 'user', content: text }
  const nextHistory = [...history, userMessage]
  const messageElement = addMessage('user', text)
  input.value = ''
  feedback.textContent = 'Responses API에 요청을 보내고 있어요.'
  setStatus('pending', '요청 중')
  setLoading(true)

  try {
    const reply = await requestReply(apiKey, nextHistory)
    // 성공한 대화만 다음 요청의 input에 포함합니다.
    history = [...nextHistory, { role: 'assistant', content: reply }]
    addMessage('assistant', reply)
    setStatus('success', '요청 성공')
    feedback.textContent = '답변을 받았어요. 이어서 질문해 보세요.'
  } catch (error) {
    messageElement.remove()
    emptyState.hidden = messages.childElementCount > 0
    input.value = text
    setStatus('error', '요청 실패')
    feedback.textContent = error.message
  } finally {
    setLoading(false)
    input.focus()
  }
})

input.addEventListener('input', updateSendButton)
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    form.requestSubmit()
  }
})

resetButton.addEventListener('click', () => {
  if (isLoading) return
  history = []
  messages.replaceChildren()
  emptyState.hidden = false
  input.value = ''
  feedback.textContent = apiKey
    ? '대화를 초기화했어요. 새로운 질문을 남겨 보세요.'
    : '.env.local에 VITE_OPENAI_API_KEY를 입력하고 개발 서버를 재시작해 주세요.'
  updateSendButton()
  input.focus()
})
