/**
 * JIYOO – Server-Side Supabase Persistence, Auth & Storage Bridge
 *
 * Uses the official `@supabase/supabase-js` SDK on the Express backend.
 * Authenticates using `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)
 * strictly on the server (never exposed to client bundles).
 * Operates non-blockingly alongside Firestore / ServerFallbackDb.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  apiKey: string;
  anonKey: string;
  storageBucket: string;
  enabled: boolean;
  mode: 'service_role' | 'anon' | 'unconfigured';
}

export function getSupabaseConfig(): SupabaseConfig {
  const rawUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const apiKey = serviceRoleKey || anonKey;
  const storageBucket =
    (
      process.env.SUPABASE_STORAGE_BUCKET ||
      process.env.VITE_SUPABASE_STORAGE_BUCKET ||
      'jiyoo-media'
    ).trim() || 'jiyoo-media';

  const isPlaceholder =
    rawUrl.includes('your-project-ref.supabase.co') ||
    apiKey === 'your-supabase-service-role-secret-key' ||
    apiKey === 'your-supabase-anon-public-key';

  const enabled = Boolean(rawUrl && apiKey && rawUrl.startsWith('http') && !isPlaceholder);

  return {
    url: rawUrl,
    apiKey,
    anonKey: anonKey || apiKey,
    storageBucket,
    enabled,
    mode: enabled ? (serviceRoleKey ? 'service_role' : 'anon') : 'unconfigured',
  };
}

let cachedServerClient: SupabaseClient | null = null;
let cachedConfigKey = '';

/**
 * Returns a singleton server-side `@supabase/supabase-js` client configured
 * with `persistSession: false` and `autoRefreshToken: false`.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) return null;

  const keySignature = `${cfg.url}|${cfg.apiKey}`;
  if (!cachedServerClient || cachedConfigKey !== keySignature) {
    cachedServerClient = createClient(cfg.url, cfg.apiKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    cachedConfigKey = keySignature;
  }
  return cachedServerClient;
}

/**
 * Verifies a Supabase JWT access token sent via `Authorization: Bearer <token>`
 * and returns normalized user identity claims.
 */
export async function verifySupabaseAccessToken(token: string): Promise<{
  uid: string;
  email: string;
  email_verified: boolean;
  name: string;
  role: string;
  admin: boolean;
} | null> {
  if (!token || token.startsWith('jiyoo_admin_sig.')) return null;
  const client = getServerSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    const u = data.user;
    const email = String(u.email || '').trim().toLowerCase();
    const emailVerified = Boolean(u.email_confirmed_at || u.confirmed_at);
    const metaRole =
      String(u.app_metadata?.role || u.user_metadata?.role || 'user').toLowerCase();
    const isAdmin = metaRole === 'admin';
    const name =
      String(
        u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          email.split('@')[0] ||
          'User'
      ).trim();

    return {
      uid: u.id,
      email,
      email_verified: emailVerified,
      name,
      role: isAdmin ? 'admin' : 'user',
      admin: isAdmin,
    };
  } catch {
    return null;
  }
}

export interface SupabasePingResult {
  connected: boolean;
  configured: boolean;
  latencyMs: number | null;
  urlHost: string | null;
  mode: 'service_role' | 'anon' | 'unconfigured';
  error?: string;
}

/**
 * Pings the Supabase PostgreSQL database (`public.jiyoo_documents`) to verify
 * live connectivity and measure round-trip latency.
 */
export async function pingSupabaseDatabase(): Promise<SupabasePingResult> {
  const cfg = getSupabaseConfig();
  let urlHost: string | null = null;
  if (cfg.enabled) {
    try {
      urlHost = new URL(cfg.url).host;
    } catch {
      urlHost = null;
    }
  }

  const client = getServerSupabaseClient();
  if (!cfg.enabled || !client) {
    return {
      connected: false,
      configured: false,
      latencyMs: null,
      urlHost: null,
      mode: 'unconfigured',
    };
  }

  const startMs = Date.now();
  try {
    const { error } = await client
      .from('jiyoo_documents')
      .select('doc_id', { head: true })
      .limit(1);

    const latencyMs = Math.max(1, Date.now() - startMs);
    if (error) {
      return {
        connected: false,
        configured: true,
        latencyMs,
        urlHost,
        mode: cfg.mode,
        error: error.message,
      };
    }

    return {
      connected: true,
      configured: true,
      latencyMs,
      urlHost,
      mode: cfg.mode,
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      latencyMs: Math.max(1, Date.now() - startMs),
      urlHost,
      mode: cfg.mode,
      error: err?.message || 'Failed to ping Supabase database',
    };
  }
}

let bucketChecked = false;

/**
 * Uploads an image buffer to Supabase Storage (`jiyoo-media` bucket) using
 * `@supabase/supabase-js` and returns its public URL.
 */
export async function uploadBufferToSupabaseStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string | null; error?: string }> {
  const cfg = getSupabaseConfig();
  const client = getServerSupabaseClient();
  if (!cfg.enabled || !client) {
    return { url: null, error: 'Supabase Storage is not configured' };
  }

  try {
    if (!bucketChecked && cfg.mode === 'service_role') {
      bucketChecked = true;
      await client.storage
        .createBucket(cfg.storageBucket, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        })
        .catch(() => {});
    }

    const objectPath = `uploads/${filename}`;
    const { error: uploadErr } = await client.storage
      .from(cfg.storageBucket)
      .upload(objectPath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadErr) {
      return { url: null, error: uploadErr.message };
    }

    const { data } = client.storage.from(cfg.storageBucket).getPublicUrl(objectPath);
    return { url: data?.publicUrl || null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Supabase Storage upload failed' };
  }
}

/**
 * Upserts a document into `public.jiyoo_documents` and also syncs structured
 * relational tables (`products`, `categories`, `orders`, `users`, `reviews`,
 * `coupons`, `settings`, `audit_logs`) via `@supabase/supabase-js`.
 */
export async function syncDocumentToSupabase(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  const nowIso = new Date().toISOString();

  try {
    await client.from('jiyoo_documents').upsert(
      {
        collection: collectionName,
        doc_id: String(docId),
        data: data || {},
        updated_at: nowIso,
      },
      { onConflict: 'collection,doc_id' }
    );

    if (collectionName === 'products') {
      const numericPrice =
        Number(data.numericPrice) ||
        parseFloat(String(data.price || '0').replace(/[^0-9.]/g, '')) ||
        0;
      await client.from('products').upsert(
        {
          id: String(docId),
          name: String(data.name || ''),
          category_id: String(data.categoryId || data.category || 'general'),
          subcategory_id: data.subcategoryId ? String(data.subcategoryId) : null,
          sub_subcategory_id: data.subSubcategoryId ? String(data.subSubcategoryId) : null,
          price: numericPrice,
          mrp: typeof data.mrp === 'number' ? data.mrp : null,
          unit: String(data.unit || '1 kg'),
          image: data.image ? String(data.image) : null,
          images: Array.isArray(data.images) ? data.images : [],
          description: String(data.description || ''),
          wholesale_eligible: Boolean(data.wholesaleEligible),
          wholesale_price:
            typeof data.wholesalePrice === 'number' ? data.wholesalePrice : numericPrice,
          wholesale_unit: data.wholesaleUnit ? String(data.wholesaleUnit) : null,
          wholesale_min_qty:
            typeof data.wholesaleMinQty === 'number' ? data.wholesaleMinQty : 1,
          stock: typeof data.stock === 'number' ? data.stock : 250,
          reserved_stock: typeof data.reservedStock === 'number' ? data.reservedStock : 0,
          stock_status: String(data.stockStatus || 'in_stock'),
          is_deleted: Boolean(data.isDeleted),
          admin_edited: Boolean(data.adminEdited),
          raw_data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'categories') {
      await client.from('categories').upsert(
        {
          id: String(docId),
          name: String(data.name || docId),
          slug: data.slug ? String(data.slug) : String(docId),
          image: data.image ? String(data.image) : null,
          icon: data.icon ? String(data.icon) : null,
          subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
          is_deleted: Boolean(data.isDeleted),
          raw_data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'orders') {
      await client.from('orders').upsert(
        {
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
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'users') {
      await client.from('users').upsert(
        {
          id: String(docId),
          email: data.email ? String(data.email) : null,
          name: data.name || data.displayName || null,
          phone: data.phone ? String(data.phone) : null,
          address: data.address ? String(data.address) : null,
          pincode: data.pincode ? String(data.pincode) : null,
          picture: data.picture ? String(data.picture) : null,
          role: String(data.role || 'user'),
          wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
          raw_data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'reviews') {
      await client.from('reviews').upsert(
        {
          id: String(docId),
          product_id: String(data.productId || 'general'),
          user_id: data.userId ? String(data.userId) : null,
          user_name: String(data.userName || data.author || 'Verified Customer'),
          rating: Math.min(5, Math.max(1, Number(data.rating || 5))),
          comment: String(data.comment || data.text || ''),
          status: String(data.status || 'approved'),
          raw_data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'coupons') {
      await client.from('coupons').upsert(
        {
          id: String(docId),
          code: String(data.code || docId).toUpperCase(),
          discount_type: String(data.discountType || 'percentage'),
          discount_value: Number(data.discountValue || 0),
          min_order_value: Number(data.minOrderValue || 0),
          max_discount: typeof data.maxDiscount === 'number' ? data.maxDiscount : null,
          is_active: data.isActive !== false,
          used_count: Number(data.usedCount || 0),
          raw_data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'settings') {
      await client.from('settings').upsert(
        {
          id: String(docId),
          data: data || {},
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } else if (collectionName === 'audit_logs') {
      await client.from('audit_logs').upsert(
        {
          id: String(docId),
          action: String(data.action || 'EVENT'),
          category: String(data.category || 'SYSTEM'),
          actor: String(data.actor || 'system'),
          actor_role: String(data.actorRole || 'system'),
          order_id: data.orderId ? String(data.orderId) : null,
          details: data.details ? String(data.details) : null,
          raw_data: data || {},
          created_at: data.createdAt || nowIso,
        },
        { onConflict: 'id' }
      );
    }
  } catch (err) {
    console.warn(
      `[SupabaseBridge] Failed to sync ${collectionName}/${docId}:`,
      (err as any)?.message || err
    );
  }
}

/**
 * Deletes a document from `public.jiyoo_documents` and its relational table in Supabase.
 */
export async function deleteDocumentFromSupabase(
  collectionName: string,
  docId: string
): Promise<void> {
  const client = getServerSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('jiyoo_documents')
      .delete()
      .eq('collection', collectionName)
      .eq('doc_id', String(docId));

    const relationalTables = new Set([
      'products',
      'categories',
      'orders',
      'users',
      'reviews',
      'coupons',
      'settings',
      'audit_logs',
    ]);
    if (relationalTables.has(collectionName)) {
      await client.from(collectionName).delete().eq('id', String(docId));
    }
  } catch (err) {
    console.warn(
      `[SupabaseBridge] Failed to delete ${collectionName}/${docId}:`,
      (err as any)?.message || err
    );
  }
}

/**
 * Fetches all stored documents from `public.jiyoo_documents` on server startup
 * to hydrate the local store when Supabase is configured.
 */
export async function fetchAllDocumentsFromSupabase(): Promise<
  Record<string, Record<string, Record<string, any>>> | null
> {
  const client = getServerSupabaseClient();
  if (!client) return null;

  try {
    const { data: rows, error } = await client
      .from('jiyoo_documents')
      .select('collection, doc_id, data')
      .limit(5000);

    if (error || !Array.isArray(rows)) return null;

    const hydrated: Record<string, Record<string, Record<string, any>>> = {};
    for (const row of rows) {
      const col = String(row?.collection || '').trim();
      const id = String(row?.doc_id || '').trim();
      if (!col || !id || !row?.data || typeof row.data !== 'object') continue;
      if (!hydrated[col]) hydrated[col] = {};
      hydrated[col][id] = row.data as Record<string, any>;
    }
    return hydrated;
  } catch {
    return null;
  }
}

/**
 * Bulk-pushes an entire collection map to `public.jiyoo_documents` in batches
 * using `@supabase/supabase-js`.
 */
export async function bulkSyncStoreToSupabase(
  storeSnapshot: Record<string, Record<string, Record<string, any>>>
): Promise<{ syncedCount: number; error?: string }> {
  const cfg = getSupabaseConfig();
  const client = getServerSupabaseClient();
  if (!cfg.enabled || !client) {
    return {
      syncedCount: 0,
      error:
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are not configured in environment variables.',
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
      const { error } = await client
        .from('jiyoo_documents')
        .upsert(chunk, { onConflict: 'collection,doc_id' });

      if (error) {
        return {
          syncedCount,
          error: `Supabase upsert error: ${error.message}`,
        };
      }
      syncedCount += chunk.length;
    }
    return { syncedCount };
  } catch (err: any) {
    return {
      syncedCount,
      error: err?.message || 'Failed to reach Supabase endpoint.',
    };
  }
}
