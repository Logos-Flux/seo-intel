import './cluster-job'

console.log('seo-api worker process started — listening on BullMQ queues')

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down`)
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
