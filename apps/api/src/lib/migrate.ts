import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pool } from './db'

// Apply all SQL files in migrations/ in lexical order. Migrations are
// written with `IF NOT EXISTS` so re-running them is a no-op. Called on
// every app boot.
export async function runMigrations(): Promise<void> {
	const migrationsDir = join(process.cwd(), 'migrations')
	let files: string[]
	try {
		files = readdirSync(migrationsDir)
			.filter((f) => f.endsWith('.sql'))
			.sort()
	} catch (err) {
		console.warn('[migrate] migrations/ directory not found, skipping:', (err as Error).message)
		return
	}

	for (const file of files) {
		const sql = readFileSync(join(migrationsDir, file), 'utf8')
		console.log(`[migrate] applying ${file}`)
		await pool.query(sql)
	}
	console.log(`[migrate] applied ${files.length} file(s)`)
}
