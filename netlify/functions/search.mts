import { runWebSearch, readEnv } from '../../server/backend'

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  try {
    const { query } = (await req.json().catch(() => ({}))) as { query?: string }
    if (!query || typeof query !== 'string' || !query.trim()) {
      return json({ error: 'Missing query.' }, 400)
    }
    const { answer, results } = await runWebSearch(readEnv(), query.trim())
    return json({ query: query.trim(), answer, results }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

export const config = { path: '/api/search' }
