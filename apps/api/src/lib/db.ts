import pg from 'pg'
import { createD1Compat } from './d1-shim'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
	throw new Error('DATABASE_URL is not set')
}

export const pool = new pg.Pool({ connectionString })

// D1-compat facade for code copied from the Cloudflare Workers project.
export const db = createD1Compat(pool)
