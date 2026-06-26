import { getIceServers, readEnv } from '../../server/backend'

const json = (o: unknown, status: number) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

export default async (): Promise<Response> => {
  try {
    const { status, text } = await getIceServers(readEnv())
    return new Response(text, { status, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
}

export const config = { path: '/api/realtime/ice' }
