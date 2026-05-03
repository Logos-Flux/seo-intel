import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export type ClusterJobPayload = {
	jobId: string
	profileId: string
	seed: string
	threshold: number
}

const redisUrl = process.env.REDIS_URL

// Boot tolerates missing REDIS_URL — the HTTP API still serves and just
// returns an explanatory error if a request needs a job queued. Worker
// process group requires REDIS_URL and will crash early without it.
let _connection: IORedis | null = null
let _clusterJobQueue: Queue<ClusterJobPayload> | null = null

if (redisUrl) {
	_connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
	_clusterJobQueue = new Queue<ClusterJobPayload>('cluster-job', { connection: _connection })
}

export const connection = _connection
export const clusterJobQueue = _clusterJobQueue

export async function enqueueClusterJob(payload: ClusterJobPayload): Promise<void> {
	if (!_clusterJobQueue) {
		throw new Error('REDIS_URL is not set; cluster-job queue is unavailable')
	}
	await _clusterJobQueue.add('cluster-job', payload)
}
