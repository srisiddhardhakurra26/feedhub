import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Basic Groq-backed Q&A. For now it answers from the model's general knowledge;
// the plan is to grow this into RAG over the user's feed (retrieve relevant
// items, then ground the answer in them). Kept intentionally simple.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

const SYSTEM_PROMPT =
  'You are the assistant inside FeedHub, a personal news/feed reader. ' +
  'Answer concisely in 1-4 sentences. You do not yet have access to the ' +
  "user's actual feed items, so answer from general knowledge and say so if a " +
  'question needs their specific feed.'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!question) {
    return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI is not configured yet — set GROQ_API_KEY on the server.' },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[ask] groq error', res.status, detail.slice(0, 300))
      return NextResponse.json({ error: `AI request failed (${res.status}).` }, { status: 502 })
    }

    const data = await res.json()
    const answer = data?.choices?.[0]?.message?.content?.trim() ?? ''
    return NextResponse.json({ answer: answer || '(no answer)' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'request failed'
    console.error('[ask] error', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
