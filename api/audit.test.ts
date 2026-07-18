import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_REQUEST } from '../src/audit'
import handler, { ACCESS_CODE_MINIMUM_LENGTH, AUDIT_COST_LIMITS, DEFAULT_OPENAI_MODEL, accessCodeMatches } from './audit'

const originalApiKey = process.env.OPENAI_API_KEY
const originalAccessCode = process.env.AUDIT_ACCESS_CODE

function restoreEnvironment(): void {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalApiKey
  if (originalAccessCode === undefined) delete process.env.AUDIT_ACCESS_CODE
  else process.env.AUDIT_ACCESS_CODE = originalAccessCode
}

function makeResponse() {
  const result: { statusCode: number; body?: unknown } = { statusCode: 200 }
  const response = {
    setHeader: () => undefined,
    status(code: number) {
      result.statusCode = code
      return response
    },
    json(payload: unknown) {
      result.body = payload
    },
    end: () => undefined,
  }
  return { response, result }
}

afterEach(restoreEnvironment)

describe('private judge protections', () => {
  it('accepts only an exact non-empty judge access code', () => {
    expect(accessCodeMatches('Judge-Only-2026', 'Judge-Only-2026')).toBe(true)
    expect(accessCodeMatches('judge-only-2026', 'Judge-Only-2026')).toBe(false)
    expect(accessCodeMatches('', 'Judge-Only-2026')).toBe(false)
    expect(accessCodeMatches('Judge-Only-2026', undefined)).toBe(false)
  })

  it('defaults to the lowest-cost GPT-5.6 tier and compact outputs', () => {
    expect(DEFAULT_OPENAI_MODEL).toBe('gpt-5.6-luna')
    expect(AUDIT_COST_LIMITS.maxOutputTokens).toBeLessThanOrEqual(120)
    expect(AUDIT_COST_LIMITS.maxReasonWords).toBeLessThanOrEqual(20)
  })

  it('requires a non-trivial access code', () => {
    expect(ACCESS_CODE_MINIMUM_LENGTH).toBeGreaterThanOrEqual(8)
  })

  it('rejects an incorrect code before any model audit can start', async () => {
    process.env.OPENAI_API_KEY = 'test-only-key'
    process.env.AUDIT_ACCESS_CODE = 'Judge-Only-2026'
    const { response, result } = makeResponse()

    await handler({
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'x-forwarded-for': '192.0.2.10' },
      body: { ...DEMO_REQUEST, accessCode: 'Wrong-Code-2026' },
    }, response)

    expect(result.statusCode).toBe(401)
    expect(result.body).toEqual({ error: 'The judge access code was not accepted.' })
  })

  it('stays unavailable until both server-only secrets are configured', async () => {
    delete process.env.OPENAI_API_KEY
    delete process.env.AUDIT_ACCESS_CODE
    const { response, result } = makeResponse()

    await handler({
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'x-forwarded-for': '192.0.2.11' },
      body: { ...DEMO_REQUEST, accessCode: 'Judge-Only-2026' },
    }, response)

    expect(result.statusCode).toBe(503)
    expect(result.body).toEqual({ error: 'Private judge mode has not been configured.' })
  })
})
