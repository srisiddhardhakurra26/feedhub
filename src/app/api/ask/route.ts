import { NextResponse, type NextRequest } from 'next/server'
import { searchRankedItems } from '@/lib/search'

export const runtime = 'nodejs'
export const maxDuration = 30

// RAG over the user's feed: retrieve the most relevant items (hybrid semantic +
// lexical, via searchRankedItems), then have Groq answer grounded ONLY in those
// items, with [n] citations. Falls back to "nothing in your feed" rather than
// inventing facts.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'
const TOP_K = 8
const SNIPPET_CHARS = 320

const SYSTEM_PROMPT =
  'You are the assistant inside FeedHub, a personal news/feed reader. Answer the ' +
  "user's question using ONLY the feed items in CONTEXT. Cite the items you rely " +
  'on inline by their bracketed number, e.g. [2]. If CONTEXT does not contain the ' +
  'answer, say you could not find it in their feed — do NOT use outside knowledge ' +
  'or invent details. Be concise: 2-5 sentences.'

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

  // 1. Retrieve relevant feed items.
  let items: Awaited<ReturnType<typeof searchRankedItems>>['items'] = []
  try {
    const result = await searchRankedItems({ q: question, filter: 'all', offset: 0, take: TOP_K })
    items = result.items
  } catch (err) {
    console.error('[ask] retrieval failed', err)
    // Continue with no context; the model will say it found nothing.
  }

  // 2. Build the grounded context block.
  const context = items
    .map((it, i) => {
      const date = it.publishedAt.slice(0, 10)
      const src = it.source?.label || it.source?.identifier || it.source?.type || 'source'
      const snippet = (it.body || '').replace(/\s+/g, ' ').trim().slice(0, SNIPPET_CHARS)
      return `[${i + 1}] ${it.title}\n    source: ${src} | date: ${date}${snippet ? `\n    ${snippet}` : ''}`
    })
    .join('\n\n')

  const userMessage = context
    ? `CONTEXT (top ${items.length} matching feed items):\n${context}\n\nQUESTION: ${question}`
    : `CONTEXT: (no matching items found in the feed)\n\nQUESTION: ${question}`

  // 3. Generate the grounded answer.
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
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
    const sources = items.map((it, i) => ({
      n: i + 1,
      title: it.title,
      url: it.url,
      source: it.source?.label || it.source?.type || null,
    }))
    return NextResponse.json({ answer: answer || '(no answer)', sources })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'request failed'
    console.error('[ask] error', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
