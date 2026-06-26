import { buildSession, readEnv } from '../../server/backend'

export default async (): Promise<Response> =>
  new Response(JSON.stringify(buildSession(readEnv())), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

export const config = { path: '/api/realtime/session' }
