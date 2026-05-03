import { Worker } from 'bullmq'
import { connection, type ClusterJobPayload } from '../lib/queue'
import { db } from '../lib/db'
import { runClusterPipeline } from '../services/cluster-pipeline'

if (!connection) {
	throw new Error('REDIS_URL is not set; worker process cannot start')
}

const env = {
	DB: db,
	DATAFORSEO_LOGIN: process.env.DATAFORSEO_LOGIN ?? '',
	DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD ?? '',
	CF_API_GATEWAY: process.env.CF_API_GATEWAY ?? '',
}

export const clusterJobWorker = new Worker<ClusterJobPayload>(
	'cluster-job',
	async (job) => {
		const { jobId, profileId, seed, threshold } = job.data

		const updateStatus = async (status: string) => {
			await db
				.prepare('UPDATE keyword_clusters SET status = ? WHERE id = ?')
				.bind(status, jobId)
				.run()
		}

		try {
			await runClusterPipeline(jobId, profileId, seed, threshold, env, updateStatus)
			await db
				.prepare("UPDATE keyword_clusters SET status = 'complete', completed_at = now() WHERE id = ?")
				.bind(jobId)
				.run()
			return { ok: true, jobId }
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			await db
				.prepare("UPDATE keyword_clusters SET status = 'error', error_message = ? WHERE id = ?")
				.bind(message, jobId)
				.run()
			throw err
		}
	},
	{ connection },
)

clusterJobWorker.on('completed', (job) => {
	console.log(`[cluster-job] completed ${job.id}`)
})

clusterJobWorker.on('failed', (job, err) => {
	console.error(`[cluster-job] failed ${job?.id}:`, err.message)
})
