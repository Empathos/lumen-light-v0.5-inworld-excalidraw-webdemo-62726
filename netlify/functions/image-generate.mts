import { generateImage, readEnv } from '../../server/backend'

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  try {
    const { prompt, aspect } = (await req.json().catch(() => ({}))) as {
      prompt?: string
      aspect?: string
    }
    if (!prompt || typeof prompt !== 'string') return json({ error: 'Missing prompt.' }, 400)
    const { status, body } = await generateImage(readEnv(), prompt, aspect)
    return json(body, status)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

export const config = { path: '/api/image/generate' }
