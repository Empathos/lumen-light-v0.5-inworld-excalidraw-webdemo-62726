import { screenshotWebsite, readEnv } from '../../server/backend'

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  try {
    const { url } = (await req.json().catch(() => ({}))) as { url?: string }
    if (!url || typeof url !== 'string' || !url.trim()) return json({ error: 'Missing url.' }, 400)
    const { status, body } = await screenshotWebsite(readEnv(), url.trim())
    return json(body, status)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

export const config = { path: '/api/screenshot' }
