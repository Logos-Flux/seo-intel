// Tiny D1-compatible facade over pg.Pool so route code copied verbatim from
// the Cloudflare Workers project keeps working in Node. Translates `?` →
// `$1, $2, ...` and rewrites SQLite-specific `datetime('now')` calls to `now()`.
//
// Only the subset of D1's API the SEO codebase actually uses:
//   prepare(sql)            → unbound statement (no args, runs as-is)
//   prepare(sql).bind(...)  → bound statement
//   .run() | .first() | .all()  on either
//   batch([stmt, ...])      → all in one transaction
//
// Drizzle-based rewrite is a future cleanup.

import type { Pool, PoolClient, QueryResult } from 'pg'

export interface D1RunResult {
	success: boolean
	meta: { changes: number }
}

export interface D1AllResult<T = Record<string, unknown>> {
	results: T[]
	success: boolean
}

export interface D1Statement {
	bind(...values: unknown[]): D1Statement
	run(): Promise<D1RunResult>
	first<T = Record<string, unknown>>(): Promise<T | null>
	all<T = Record<string, unknown>>(): Promise<D1AllResult<T>>
	// Internal: text + binds for batch composition
	__compile(): { text: string; values: unknown[] }
}

// Backwards-compatible aliases for callers that imported the older names.
export type D1PreparedStatement = D1Statement
export type D1BoundStatement = D1Statement

export interface D1Compat {
	prepare(sql: string): D1Statement
	batch<T = Record<string, unknown>>(stmts: D1Statement[]): Promise<D1AllResult<T>[]>
}

function rewriteSql(sql: string): string {
	let next = sql.replace(/datetime\('now'\)/gi, 'now()')
	let n = 0
	next = next.replace(/\?/g, () => {
		n += 1
		return `$${n}`
	})
	return next
}

function makeStatement(pool: Pool, rawSql: string, values: unknown[]): D1Statement {
	const text = rewriteSql(rawSql)
	const exec = async (client?: PoolClient): Promise<QueryResult> => {
		const target = client ?? pool
		return target.query(text, values)
	}
	return {
		bind(...nextValues: unknown[]): D1Statement {
			return makeStatement(pool, rawSql, nextValues)
		},
		async run() {
			const r = await exec()
			return { success: true, meta: { changes: r.rowCount ?? 0 } }
		},
		async first<T = Record<string, unknown>>() {
			const r = await exec()
			return ((r.rows[0] as T) ?? null) as T | null
		},
		async all<T = Record<string, unknown>>() {
			const r = await exec()
			return { results: r.rows as T[], success: true }
		},
		__compile() {
			return { text, values }
		},
	}
}

export function createD1Compat(pool: Pool): D1Compat {
	return {
		prepare(sql: string): D1Statement {
			return makeStatement(pool, sql, [])
		},
		async batch<T = Record<string, unknown>>(stmts: D1Statement[]): Promise<D1AllResult<T>[]> {
			const client = await pool.connect()
			try {
				await client.query('BEGIN')
				const results: D1AllResult<T>[] = []
				for (const stmt of stmts) {
					const { text, values } = stmt.__compile()
					const r = await client.query(text, values)
					results.push({ results: r.rows as T[], success: true })
				}
				await client.query('COMMIT')
				return results
			} catch (err) {
				await client.query('ROLLBACK').catch(() => {})
				throw err
			} finally {
				client.release()
			}
		},
	}
}
