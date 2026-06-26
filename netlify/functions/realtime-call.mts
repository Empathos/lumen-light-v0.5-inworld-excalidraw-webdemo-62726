import { createCall, readEnv } from '../../server/backend'

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  try {
    const { sdp } = (await req.json().catch(() => ({}))) as { sdp?: string }
    if (!sdp) return json({ error: 'Missing sdp offer in request body.' }, 400)
    const { status, text } = await createCall(readEnv(), sdp)
    return new Response(text, { status, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

export const config = { path: '/api/realtime/call' }
