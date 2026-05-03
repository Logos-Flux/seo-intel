import { Hono } from 'hono';
import type { Env } from '../types';
import { enqueueClusterJob } from '../lib/queue';
import ExcelJS from 'exceljs';

export const clusterRoutes = new Hono<{ Bindings: Env }>();

// POST / — start a new cluster job
clusterRoutes.post('/', async (c) => {
  const profileId = c.req.param('id');
  const body = await c.req.json<{ seed: string; threshold?: number }>();

  if (!body.seed?.trim()) {
    return c.json({ error: 'seed keyword is required' }, 400);
  }

  const jobId = crypto.randomUUID();
  const threshold = body.threshold ?? 0.75;

  await c.env.DB.prepare(
    'INSERT INTO keyword_clusters (id, profile_id, seed_keyword, similarity_threshold) VALUES (?, ?, ?, ?)'
  ).bind(jobId, profileId, body.seed.trim().toLowerCase(), threshold).run();

  // Enqueue the cluster job for the BullMQ worker process to pick up.
  await enqueueClusterJob({ jobId, profileId: profileId!, seed: body.seed.trim().toLowerCase(), threshold });

  return c.json({ job_id: jobId }, 201);
});

// GET / — list all cluster jobs for profile
clusterRoutes.get('/', async (c) => {
  const profileId = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    'SELECT id, seed_keyword, status, error_message, similarity_threshold, created_at, completed_at FROM keyword_clusters WHERE profile_id = ? ORDER BY created_at DESC'
  ).bind(profileId).all();

  const clusters = [];
  for (const row of results) {
    let term_count = 0;
    let group_count = 0;
    if ((row as any).status === 'complete') {
      const tc = await c.env.DB.prepare('SELECT COUNT(*) as c FROM keyword_cluster_terms WHERE cluster_id = ?').bind((row as any).id).first<{ c: number }>();
      const gc = await c.env.DB.prepare('SELECT COUNT(*) as c FROM keyword_cluster_groups WHERE cluster_id = ?').bind((row as any).id).first<{ c: number }>();
      term_count = tc?.c ?? 0;
      group_count = gc?.c ?? 0;
    }
    clusters.push({ ...row, term_count, group_count });
  }

  return c.json({ clusters });
});

// GET /:clusterId — full hierarchical result
clusterRoutes.get('/:clusterId', async (c) => {
  const clusterId = c.req.param('clusterId');
  const cluster = await c.env.DB.prepare('SELECT * FROM keyword_clusters WHERE id = ?')
    .bind(clusterId).first();
  if (!cluster) return c.json({ error: 'Cluster not found' }, 404);

  const { results: groups } = await c.env.DB.prepare(
    'SELECT * FROM keyword_cluster_groups WHERE cluster_id = ? ORDER BY total_volume DESC'
  ).bind(clusterId).all();

  const { results: allTerms } = await c.env.DB.prepare(
    'SELECT * FROM keyword_cluster_terms WHERE cluster_id = ? ORDER BY search_volume DESC'
  ).bind(clusterId).all();

  const termsByGroup = new Map<string, any[]>();
  for (const term of allTerms) {
    const gid = (term as any).group_id;
    const list = termsByGroup.get(gid) ?? [];
    list.push(term);
    termsByGroup.set(gid, list);
  }

  const hierarchy = groups.map((g: any) => ({
    ...g,
    terms: termsByGroup.get(g.id) ?? [],
  }));

  return c.json({ cluster, groups: hierarchy });
});

// GET /:clusterId/status — job status
clusterRoutes.get('/:clusterId/status', async (c) => {
  const clusterId = c.req.param('clusterId');
  const row = await c.env.DB.prepare('SELECT status, error_message FROM keyword_clusters WHERE id = ?')
    .bind(clusterId).first<{ status: string; error_message: string | null }>();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// DELETE /:clusterId — delete cluster + all data
clusterRoutes.delete('/:clusterId', async (c) => {
  const clusterId = c.req.param('clusterId');
  await c.env.DB.prepare('DELETE FROM keyword_cluster_terms WHERE cluster_id = ?').bind(clusterId).run();
  await c.env.DB.prepare('DELETE FROM keyword_cluster_groups WHERE cluster_id = ?').bind(clusterId).run();
  await c.env.DB.prepare('DELETE FROM keyword_clusters WHERE id = ?').bind(clusterId).run();
  return c.json({ deleted: true });
});

// GET /:clusterId/export.xlsx — XLSX download
clusterRoutes.get('/:clusterId/export.xlsx', async (c) => {
  const clusterId = c.req.param('clusterId');
  const cluster = await c.env.DB.prepare('SELECT * FROM keyword_clusters WHERE id = ?')
    .bind(clusterId).first<any>();
  if (!cluster) return c.json({ error: 'Not found' }, 404);

  const { results: groups } = await c.env.DB.prepare(
    'SELECT * FROM keyword_cluster_groups WHERE cluster_id = ? ORDER BY total_volume DESC'
  ).bind(clusterId).all<any>();

  const { results: allTerms } = await c.env.DB.prepare(
    'SELECT kt.*, kg.main_keyword as cluster_main FROM keyword_cluster_terms kt JOIN keyword_cluster_groups kg ON kt.group_id = kg.id WHERE kt.cluster_id = ? ORDER BY kg.total_volume DESC, kt.search_volume DESC'
  ).bind(clusterId).all<any>();

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Clusters Overview
  const sheet1 = workbook.addWorksheet('Clusters Overview');
  sheet1.columns = [
    { header: 'Main Keyword', key: 'main_keyword', width: 30 },
    { header: 'Category Keywords', key: 'cat_count', width: 18 },
    { header: 'Long-tail Keywords', key: 'lt_count', width: 18 },
    { header: 'Total Search Volume', key: 'total_volume', width: 20 },
    { header: 'Avg Difficulty', key: 'avg_difficulty', width: 15 },
    { header: 'Avg CPC', key: 'avg_cpc', width: 12 },
  ];
  sheet1.getRow(1).font = { bold: true };
  sheet1.views = [{ state: 'frozen' as const, ySplit: 1 }];

  const termsByGroup = new Map<string, any[]>();
  for (const t of allTerms) {
    const list = termsByGroup.get(t.group_id) ?? [];
    list.push(t);
    termsByGroup.set(t.group_id, list);
  }

  for (const g of groups) {
    const gTerms = termsByGroup.get(g.id) ?? [];
    sheet1.addRow({
      main_keyword: g.main_keyword,
      cat_count: gTerms.filter((t: any) => t.tier === 'category').length,
      lt_count: gTerms.filter((t: any) => t.tier === 'long_tail').length,
      total_volume: g.total_volume,
      avg_difficulty: g.avg_difficulty,
      avg_cpc: g.avg_cpc,
    });
  }

  // Sheet 2: Full Keywords
  const sheet2 = workbook.addWorksheet('Full Keywords');
  sheet2.columns = [
    { header: 'Cluster', key: 'cluster_main', width: 25 },
    { header: 'Tier', key: 'tier', width: 12 },
    { header: 'Keyword', key: 'keyword', width: 40 },
    { header: 'Search Volume', key: 'search_volume', width: 15 },
    { header: 'CPC', key: 'cpc', width: 10 },
    { header: 'Competition', key: 'competition_level', width: 15 },
    { header: 'KD', key: 'keyword_difficulty', width: 8 },
    { header: 'Intent', key: 'search_intent', width: 15 },
    { header: 'Word Count', key: 'word_count', width: 12 },
    { header: 'Is Question', key: 'is_question', width: 12 },
  ];
  sheet2.getRow(1).font = { bold: true };
  sheet2.views = [{ state: 'frozen' as const, ySplit: 1 }];

  for (const t of allTerms) {
    sheet2.addRow({
      ...t,
      cpc: t.cpc != null ? Number(Number(t.cpc).toFixed(2)) : null,
      is_question: t.is_question ? 'Yes' : 'No',
    });
  }

  // Sheet 3: Hierarchy
  const sheet3 = workbook.addWorksheet('Hierarchy');
  sheet3.columns = [
    { header: 'Main Keyword', key: 'main', width: 30 },
    { header: 'Category', key: 'category', width: 35 },
    { header: 'Long-tail', key: 'longtail', width: 50 },
  ];
  sheet3.getRow(1).font = { bold: true };
  sheet3.views = [{ state: 'frozen' as const, ySplit: 1 }];

  for (const g of groups) {
    const gTerms = termsByGroup.get(g.id) ?? [];
    const categories = gTerms.filter((t: any) => t.tier === 'category');
    const longTails = gTerms.filter((t: any) => t.tier === 'long_tail');

    const mainRow = sheet3.addRow({ main: g.main_keyword, category: '', longtail: '' });
    mainRow.getCell('main').font = { bold: true };

    for (const cat of categories) {
      sheet3.addRow({ main: '', category: cat.keyword, longtail: '' });
    }
    for (const lt of longTails) {
      sheet3.addRow({ main: '', category: '', longtail: lt.keyword });
    }
  }

  // Format number columns
  sheet1.getColumn('total_volume').numFmt = '#,##0';
  sheet1.getColumn('avg_cpc').numFmt = '$#,##0.00';
  sheet2.getColumn('search_volume').numFmt = '#,##0';
  sheet2.getColumn('cpc').numFmt = '$#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="clusters-${cluster.seed_keyword}.xlsx"`,
    },
  });
});
