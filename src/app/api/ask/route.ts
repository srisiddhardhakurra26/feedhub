import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 30

// RAG over the user's feed: retrieve the most relevant items, then have Groq
// answer grounded ONLY in those items, with [n] citations. Falls back to
// "nothing in your feed" rather than inventing facts.
//
// Retrieval is keyword + recency (not vector): items on this deployment aren't
// embedded, so semantic search returns nothing. Keyword overlap on title/body
// with a recency tiebreak works today at zero embedding cost; if embeddings are
// enabled later this can be upgraded to hybrid via lib/search's searchRankedItems.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'
const TOP_K = 8
const SNIPPET_CHARS = 320
const CANDIDATE_LIMIT = 1500

const STOPWORDS = new Set(
  ('the a an and or of to in on for is are was were be been being this that these those what whats ' +
    'which who whom how when where why with from about into over after before my your our their it its ' +
    'i you we they me us them do does did can could should would will latest news today feed any some ' +
    'all more most just like get got new tell show give find any there here').split(' '),
)

function keywords(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
    ),
  )
}

interface RetrievedItem {
  title: string
  url: string
  body: string | null
  publishedAt: Date
  source: { label: string | null; type: string; identifier: string } | null
}

async function retrieve(question: string, k: number): Promise<RetrievedItem[]> {
  const rows = await prisma.item.findMany({
    orderBy: { publishedAt: 'desc' },
    take: CANDIDATE_LIMIT,
    select: {
      title: true,
      url: true,
      body: true,
      publishedAt: true,
      source: { select: { label: true, type: true, identifier: true } },
    },
  })

  const terms = keywords(question)
  // Generic question (no meaningful keywords) → fall back to the most recent items.
  if (terms.length === 0) return rows.slice(0, k)

  const scored = rows
    .map((r) => {
      const title = r.title.toLowerCase()
      const body = (r.body || '').toLowerCase()
      let score = 0
      for (const t of terms) {
        if (title.includes(t)) score += 2
        else if (body.includes(t)) score += 1
      }
      return { r, score }
    })
    .filter((x) => x.score > 0)

  scored.sort(
    (a, b) => b.score - a.score || b.r.publishedAt.getTime() - a.r.publishedAt.getTime(),
  )
  return scored.slice(0, k).map((x) => x.r)
}

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
  let items: RetrievedItem[] = []
  try {
    items = await retrieve(question, TOP_K)
  } catch (err) {
    console.error('[ask] retrieval failed', err)
    // Continue with no context; the model will say it found nothing.
  }

  // 2. Build the grounded context block.
  const context = items
    .map((it, i) => {
      const date = it.publishedAt.toISOString().slice(0, 10)
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
