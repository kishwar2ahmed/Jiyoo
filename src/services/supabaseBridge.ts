/**
 * JIYOO Supabase Persistence & Real-Time Sync Bridge
 *
 * Connects the backend to a Supabase project via PostgREST when
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are set.
 * Operates non-blockingly alongside Firestore / ServerFallbackDb.
 */

export interface SupabaseConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const rawUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return {
    url: rawUrl,
    apiKey,
    enabled: Boolean(rawUrl && apiKey && rawUrl.startsWith('http')),
  };
}

function buildHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Upserts a document into `public.jiyoo_documents` and, for core entities
 * (`products`, `orders`, `users`), also syncs the structured relational table.
 */
export async function syncDocumentToSupabase(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) return;

  const nowIso = new Date().toISOString();

  try {
    await fetch(`${cfg.url}/rest/v1/jiyoo_documents?on_conflict=collection,doc_id`, {
      method: 'POST',
      headers: buildHeaders(cfg.apiKey, {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        collection: collectionName,
        doc_id: String(docId),
        data: data || {},
        updated_at: nowIso,
      }),
    });

    if (collectionName === 'products') {
      const numericPrice =
        Number(data.numericPrice) ||
        parseFloat(String(data.price || '0').replace(/[^0-9.]/g, '')) ||
        0;
      await fetch(`${cfg.url}/rest/v1/products?on_conflict=id`, {
        method: 'POST',
        headers: buildHeaders(cfg.apiKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: String(docId),
          name: String(data.name || ''),
          category_id: String(data.categoryId || data.category || 'general'),
          subcategory_id: data.subcategoryId ? String(data.subcategoryId) : null,
          sub_subcategory_id: data.subSubcategoryId ? String(data.subSubcategoryId) : null,
          price: numericPrice,
          mrp: typeof data.mrp === 'number' ? data.mrp : null,
          unit: String(data.unit || '1 kg'),
          image: data.image ? String(data.image) : null,
          wholesale_eligible: Boolean(data.wholesaleEligible),
          wholesale_price:
            typeof data.wholesalePrice === 'number' ? data.wholesalePrice : numericPrice,
          wholesale_unit: data.wholesaleUnit ? String(data.wholesaleUnit) : null,
          wholesale_min_qty:
            typeof data.wholesaleMinQty === 'number' ? data.wholesaleMinQty : 1,
          stock: typeof data.stock === 'number' ? data.stock : 250,
          stock_status: String(data.stockStatus || 'in_stock'),
          is_deleted: Boolean(data.isDeleted),
          raw_data: data || {},
          updated_at: nowIso,
        }),
      });
    } else if (collectionName === 'orders') {
      await fetch(`${cfg.url}/rest/v1/orders?on_conflict=id`, {
        method: 'POST',
        headers: buildHeaders(cfg.apiKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: String(docId),
          order_id: String(data.orderId || docId),
          user_id: data.userId ? String(data.userId) : null,
          customer_name: data.shippingDetails?.name || data.customerName || null,
          customer_phone: data.shippingDetails?.phone || data.customerPhone || null,
          customer_email: data.customerEmail || data.shippingDetails?.email || null,
          pincode: data.shippingDetails?.pincode || data.customerPincode || null,
          order_type: String(data.orderType || 'retail'),
          payment_method: data.paymentMethod ? String(data.paymentMethod) : null,
          payment_status: String(data.paymentStatus || 'pending'),
          order_status: String(data.orderStatus || data.status || 'pending'),
          subtotal: Number(data.subtotal || 0),
          discount_amount: Number(data.discountAmount || 0),
          delivery_fee: Number(data.deliveryFee || 0),
          amount: Number(data.amount || data.grandTotal || 0),
          items: Array.isArray(data.items) ? data.items : [],
          shipping_details: data.shippingDetails || {},
          raw_data: data || {},
          updated_at: nowIso,
        }),
      });
    } else if (collectionName === 'users') {
      await fetch(`${cfg.url}/rest/v1/users?on_conflict=id`, {
        method: 'POST',
        headers: buildHeaders(cfg.apiKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify({
          id: String(docId),
          email: data.email ? String(data.email) : null,
          name: data.name || data.displayName || null,
          phone: data.phone ? String(data.phone) : null,
          role: String(data.role || 'user'),
          raw_data: data || {},
          updated_at: nowIso,
        }),
      });
    }
  } catch (err) {
    console.warn(`[SupabaseBridge] Failed to sync ${collectionName}/${docId}:`, (err as any)?.message || err);
  }
}

/**
 * Deletes a document from `public.jiyoo_documents` in Supabase.
 */
export async function deleteDocumentFromSupabase(
  collectionName: string,
  docId: string
): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) return;

  try {
    const query = `collection=eq.${encodeURIComponent(collectionName)}&doc_id=eq.${encodeURIComponent(String(docId))}`;
    await fetch(`${cfg.url}/rest/v1/jiyoo_documents?${query}`, {
      method: 'DELETE',
      headers: buildHeaders(cfg.apiKey),
    });
  } catch (err) {
    console.warn(`[SupabaseBridge] Failed to delete ${collectionName}/${docId}:`, (err as any)?.message || err);
  }
}

/**
 * Fetches all stored documents from `public.jiyoo_documents` on server startup
 * to hydrate the local store when Supabase is configured.
 */
export async function fetchAllDocumentsFromSupabase(): Promise<
  Record<string, Record<string, Record<string, any>>> | null
> {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/jiyoo_documents?select=collection,doc_id,data&limit=5000`,
      {
        method: 'GET',
        headers: buildHeaders(cfg.apiKey),
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;

    const hydrated: Record<string, Record<string, Record<string, any>>> = {};
    for (const row of rows) {
      const col = String(row?.collection || '').trim();
      const id = String(row?.doc_id || '').trim();
      if (!col || !id || !row?.data || typeof row.data !== 'object') continue;
      if (!hydrated[col]) hydrated[col] = {};
      hydrated[col][id] = row.data;
    }
    return hydrated;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Bulk-pushes an entire collection map to `public.jiyoo_documents` in batches.
 */
export async function bulkSyncStoreToSupabase(
  storeSnapshot: Record<string, Record<string, Record<string, any>>>
): Promise<{ syncedCount: number; error?: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) {
    return {
      syncedCount: 0,
      error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are not configured in environment variables.',
    };
  }

  const nowIso = new Date().toISOString();
  const rows: Array<{
    collection: string;
    doc_id: string;
    data: Record<string, any>;
    updated_at: string;
  }> = [];

  for (const [collectionName, docsMap] of Object.entries(storeSnapshot || {})) {
    if (!docsMap || typeof docsMap !== 'object') continue;
    for (const [docId, docData] of Object.entries(docsMap)) {
      if (!docData || typeof docData !== 'object') continue;
      rows.push({
        collection: collectionName,
        doc_id: String(docId),
        data: docData,
        updated_at: nowIso,
      });
    }
  }

  let syncedCount = 0;
  const BATCH_SIZE = 200;

  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const res = await fetch(
        `${cfg.url}/rest/v1/jiyoo_documents?on_conflict=collection,doc_id`,
        {
          method: 'POST',
          headers: buildHeaders(cfg.apiKey, {
            Prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify(chunk),
        }
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        return {
          syncedCount,
          error: `Supabase REST returned HTTP ${res.status}: ${errBody.slice(0, 200)}`,
        };
      }
      syncedCount += chunk.length;
    }
    return { syncedCount };
  } catch (err: any) {
    return {
      syncedCount,
      error: err?.message || 'Failed to reach Supabase REST endpoint.',
    };
  }
}
