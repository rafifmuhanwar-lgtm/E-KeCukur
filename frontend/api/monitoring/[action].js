import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ACTIONS = new Set([
  'health',
  'today',
  'pending',
  'failed',
  'transactions',
  'details',
  'alerts'
]);
const PAYMENT_FIELDS =
  'reference_id,type,booking_id,total_amount,status,created_at,expires_at,paid_at';
const PAGE_SIZE = 10;

function isAuthorized(req) {
  const expectedKey = process.env.BACKEND_API_KEY;
  const authorization = req.headers.authorization || '';
  const bearerKey = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const providedKey = req.headers['x-api-key'] || bearerKey;

  if (
    typeof expectedKey !== 'string' ||
    expectedKey.length === 0 ||
    typeof providedKey !== 'string' ||
    providedKey.length === 0
  ) {
    return false;
  }

  const expected = Buffer.from(expectedKey, 'utf8');
  const provided = Buffer.from(providedKey, 'utf8');
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function jakartaDateRange() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { date, start: start.toISOString(), end: end.toISOString() };
}

function sendDatabaseError(res, error) {
  console.error(
    '[Payment monitoring] Database request failed:',
    typeof error?.code === 'string' ? error.code : 'UNKNOWN'
  );
  return res.status(503).json({
    ok: false,
    code: 'DATABASE_QUERY_FAILED',
    message: 'Payment data is temporarily unavailable.'
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  }

  if (!process.env.BACKEND_API_KEY) {
    return res.status(503).json({
      ok: false,
      code: 'MONITORING_API_NOT_CONFIGURED'
    });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, code: 'UNAUTHORIZED' });
  }

  const action = req.query.action;
  if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
    return res.status(404).json({ ok: false, code: 'UNKNOWN_ACTION' });
  }

  if (action === 'alerts') {
    return res.status(501).json({
      ok: false,
      code: 'ALERT_HISTORY_NOT_CONFIGURED',
      message: 'Payment alert persistence is not configured.'
    });
  }

  if (action === 'health') {
    const supabase = makeSupabaseClient();
    if (!supabase) {
      return res.status(200).json({
        ok: true,
        backendStatus: 'ONLINE',
        supabaseStatus: 'NOT CONFIGURED',
        paymentMonitoringStatus: 'NOT CONNECTED',
        alertsStatus: 'NOT CONFIGURED',
        paymentProviderStatus: 'NOT VERIFIED',
        payhookStatus: 'NOT VERIFIED'
      });
    }

    try {
      const { error } = await supabase
        .from('qris_payments')
        .select('reference_id', { head: true, count: 'exact' })
        .limit(1);
      return res.status(200).json({
        ok: true,
        backendStatus: 'ONLINE',
        supabaseStatus: error ? 'UNKNOWN' : 'CONNECTED',
        paymentMonitoringStatus: error ? 'NOT CONNECTED' : 'CONNECTED',
        alertsStatus: 'NOT CONFIGURED',
        paymentProviderStatus: 'NOT VERIFIED',
        payhookStatus: 'NOT VERIFIED'
      });
    } catch (error) {
      console.error('[Payment monitoring] Health query failed.');
      return res.status(200).json({
        ok: true,
        backendStatus: 'ONLINE',
        supabaseStatus: 'UNKNOWN',
        paymentMonitoringStatus: 'NOT CONNECTED',
        alertsStatus: 'NOT CONFIGURED',
        paymentProviderStatus: 'NOT VERIFIED',
        payhookStatus: 'NOT VERIFIED'
      });
    }
  }

  const supabase = makeSupabaseClient();
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      code: 'SUPABASE_NOT_CONFIGURED'
    });
  }

  try {
    if (action === 'today') {
      const range = jakartaDateRange();
      const statuses = [
        'PENDING',
        'PAYMENT_DETECTED',
        'PAID',
        'EXPIRED',
        'FAILED',
        'REVIEW_REQUIRED',
        'CANCELLED'
      ];
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const { count, error } = await supabase
            .from('qris_payments')
            .select('reference_id', { count: 'exact', head: true })
            .eq('status', status)
            .gte('created_at', range.start)
            .lt('created_at', range.end);
          if (error) {
            throw error;
          }
          return [status, count || 0];
        })
      );
      return res.status(200).json({
        ok: true,
        date: range.date,
        timeZone: 'Asia/Jakarta',
        counts: Object.fromEntries(counts)
      });
    }

    if (action === 'details') {
      const referenceId = req.query.referenceId;
      if (
        typeof referenceId !== 'string' ||
        !/^[A-Za-z0-9._-]{1,128}$/.test(referenceId)
      ) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_REFERENCE'
        });
      }

      const { data, error } = await supabase
        .from('qris_payments')
        .select(PAYMENT_FIELDS)
        .eq('reference_id', referenceId)
        .maybeSingle();
      if (error) {
        return sendDatabaseError(res, error);
      }
      if (!data) {
        return res.status(404).json({
          ok: false,
          code: 'PAYMENT_NOT_FOUND'
        });
      }
      return res.status(200).json({ ok: true, payment: data });
    }

    let query = supabase
      .from('qris_payments')
      .select(PAYMENT_FIELDS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (action === 'pending') {
      query = query.eq('status', 'PENDING');
    } else if (action === 'failed') {
      query = query.in('status', ['FAILED', 'EXPIRED', 'CANCELLED']);
    }

    const { data, count, error } = await query;
    if (error) {
      return sendDatabaseError(res, error);
    }

    return res.status(200).json({
      ok: true,
      action,
      count: count || 0,
      items: data || []
    });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
}
