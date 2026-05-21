import { NextResponse, type NextRequest } from 'next/server'
import { agentToolsByName, describeTools } from '@/lib/agent-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MCP_PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'feedhub', version: '0.1.0' }

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcSuccess {
  jsonrpc: '2.0'
  id: string | number | null
  result: unknown
}

interface JsonRpcError {
  jsonrpc: '2.0'
  id: string | number | null
  error: { code: number; message: string; data?: unknown }
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError

function ok(id: JsonRpcRequest['id'], result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function err(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } }
}

function checkAuth(request: NextRequest): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.APP_PASSWORD
  if (!expected) return { ok: false, reason: 'APP_PASSWORD not configured on server' }
  const header = request.headers.get('authorization')
  if (!header) return { ok: false, reason: 'Missing Authorization header' }
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return { ok: false, reason: 'Expected "Authorization: Bearer <token>"' }
  if (match[1] !== expected) return { ok: false, reason: 'Invalid token' }
  return { ok: true }
}

async function handleRpc(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  switch (req.method) {
    case 'initialize': {
      return ok(req.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      })
    }

    case 'notifications/initialized':
      // Notification — no response expected.
      return null

    case 'ping':
      return ok(req.id, {})

    case 'tools/list':
      return ok(req.id, { tools: describeTools() })

    case 'tools/call': {
      const params = req.params ?? {}
      const name = params.name as string | undefined
      const args = (params.arguments ?? {}) as Record<string, unknown>
      if (!name) return err(req.id, -32602, 'tools/call requires "name"')

      const tool = agentToolsByName.get(name)
      if (!tool) return err(req.id, -32601, `Unknown tool: ${name}`)

      const parsed = tool.inputSchema.safeParse(args)
      if (!parsed.success) {
        return err(req.id, -32602, 'Invalid tool arguments', parsed.error.issues)
      }
      try {
        const output = await tool.run(parsed.data)
        return ok(req.id, {
          content: [
            { type: 'text', text: JSON.stringify(output, null, 2) },
          ],
          structuredContent: output,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return ok(req.id, {
          content: [{ type: 'text', text: `Tool ${name} failed: ${message}` }],
          isError: true,
        })
      }
    }

    default:
      return err(req.id, -32601, `Method not found: ${req.method}`)
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAuth(request)
  if (!auth.ok) {
    return NextResponse.json(
      err(null, -32000, `Unauthorized: ${auth.reason}`),
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(err(null, -32700, 'Parse error: invalid JSON'), { status: 400 })
  }

  if (Array.isArray(body)) {
    const responses: JsonRpcResponse[] = []
    for (const item of body) {
      const res = await handleRpc(item as JsonRpcRequest)
      if (res) responses.push(res)
    }
    return NextResponse.json(responses)
  }

  const res = await handleRpc(body as JsonRpcRequest)
  if (!res) return new NextResponse(null, { status: 204 })
  return NextResponse.json(res)
}

export async function GET() {
  return NextResponse.json({
    server: SERVER_INFO,
    protocolVersion: MCP_PROTOCOL_VERSION,
    transport: 'http',
    note: 'POST JSON-RPC 2.0 requests here. Auth: Authorization: Bearer <APP_PASSWORD>.',
  })
}
