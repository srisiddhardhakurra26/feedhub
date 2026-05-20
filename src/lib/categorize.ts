import type { FeatureExtractionPipeline, Tensor } from '@huggingface/transformers'

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
// Margin = top1 - top2. If margin is too small, the model is guessing → mark Other.
const MIN_MARGIN = 0.02
const MIN_SCORE = 0.18

export const CATEGORIES = [
  {
    label: 'AI & ML',
    description:
      'artificial intelligence machine learning language models LLMs GPT Claude OpenAI Anthropic neural networks deep learning transformers prompt engineering AI agents AI research embeddings',
  },
  {
    label: 'Software',
    description:
      'software programming developer code javascript typescript python rust go java framework library API github open source web development frontend backend refactor pull request',
  },
  {
    label: 'Hardware & Tech',
    description:
      'hardware electronics chips GPU CPU nvidia apple silicon iphone android laptop computer gadget device tesla robotics manufacturing',
  },
  {
    label: 'Business',
    description:
      'business startup company funding venture capital IPO acquisition merger CEO industry market revenue B2B SaaS product launch competitor',
  },
  {
    label: 'Finance & Crypto',
    description:
      'money finance stocks investing trading portfolio retirement crypto bitcoin ethereum coins NFT 401k savings inflation market crash bull bear',
  },
  {
    label: 'Politics',
    description:
      'politics government election president congress senate law policy regulation immigration supreme court democrat republican legislation diplomacy war',
  },
  {
    label: 'Science & Health',
    description:
      'science research study paper Nature physics biology chemistry mathematics medicine health nutrition disease vaccine wellness biohacks exercise sleep',
  },
  {
    label: 'Lifestyle',
    description:
      'lifestyle personal opinion essay reflection life advice philosophy stoic mindfulness self-improvement habits productivity relationships travel food cooking',
  },
  {
    label: 'Entertainment',
    description:
      'entertainment funny meme joke video viral comedy celebrity movie show music album game gaming videogame xbox playstation steam',
  },
  {
    label: 'Career',
    description:
      'career job hiring interview resume promotion salary layoff remote work workplace boss manager employee quit fired employment',
  },
] as const

type Embedder = FeatureExtractionPipeline

const cache = globalThis as unknown as {
  __embedder?: Promise<Embedder>
  __categoryEmbeds?: Promise<Array<{ label: string; vec: Float32Array }>>
}

async function getEmbedder(): Promise<Embedder> {
  if (!cache.__embedder) {
    cache.__embedder = import('@huggingface/transformers').then(
      ({ pipeline }) => pipeline('feature-extraction', EMBED_MODEL) as Promise<Embedder>,
    )
  }
  return cache.__embedder
}

export async function embed(text: string): Promise<Float32Array> {
  const embedder = await getEmbedder()
  const t = (await embedder(text, { pooling: 'mean', normalize: true })) as Tensor
  return t.data as Float32Array
}

export function float32ToBytes(v: Float32Array): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(v.byteLength)
  const out = new Uint8Array(buf)
  out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))
  return out
}

export function bytesToFloat32(b: Uint8Array): Float32Array {
  const copy = new Uint8Array(b)
  return new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4)
}

export function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

async function getCategoryEmbeds() {
  if (!cache.__categoryEmbeds) {
    cache.__categoryEmbeds = (async () => {
      const out: Array<{ label: string; vec: Float32Array }> = []
      for (const c of CATEGORIES) {
        out.push({ label: c.label, vec: await embed(`${c.label}: ${c.description}`) })
      }
      return out
    })()
  }
  return cache.__categoryEmbeds
}

export interface CategorizeInput {
  title: string
  body?: string | null
}

export interface CategorizeResult {
  category: string
  score: number
  embedding: Float32Array
}

export async function categorize(input: CategorizeInput): Promise<CategorizeResult> {
  const text = `${input.title}. ${(input.body ?? '').slice(0, 600)}`.trim()
  if (!text) {
    const emptyVec = new Float32Array(384)
    return { category: 'Other', score: 0, embedding: emptyVec }
  }

  const [itemEmbed, categoryEmbeds] = await Promise.all([
    embed(text),
    getCategoryEmbeds(),
  ])

  const scored = categoryEmbeds
    .map((c) => ({ label: c.label, score: cosineSim(itemEmbed, c.vec) }))
    .sort((a, b) => b.score - a.score)

  const [top, second] = scored
  if (top.score < MIN_SCORE) {
    return { category: 'Other', score: top.score, embedding: itemEmbed }
  }
  if (second && top.score - second.score < MIN_MARGIN) {
    return { category: 'Other', score: top.score, embedding: itemEmbed }
  }
  return { category: top.label, score: top.score, embedding: itemEmbed }
}
