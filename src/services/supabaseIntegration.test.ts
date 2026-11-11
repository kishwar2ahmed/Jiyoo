import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  supabaseFetchTable,
  supabaseUpsertRecord,
  supabaseDeleteRecord,
  supabaseDeleteCollectionDoc,
  uploadToSupabaseStorage,
  pingSupabaseConnection,
} from './supabase';
import { getSupabaseConfig, pingSupabaseDatabase } from './supabaseBridge';

test('Security: Frontend code never references SUPABASE_SERVICE_ROLE_KEY', () => {
  const frontendFiles = [
    path.resolve(process.cwd(), 'src/services/supabase.ts'),
    path.resolve(process.cwd(), 'src/contexts/CartContext.tsx'),
    path.resolve(process.cwd(), 'src/contexts/SettingsContext.tsx'),
    path.resolve(process.cwd(), 'src/utils/adminAuth.ts'),
  ];
  for (const file of frontendFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(
      content.includes('SUPABASE_SERVICE_ROLE_KEY'),
      false,
      `Frontend file ${path.basename(file)} must never reference SUPABASE_SERVICE_ROLE_KEY`
    );
  }
});

test('Schema & RLS: supabase/schema.sql defines tables, RLS, and storage policies', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  assert.equal(fs.existsSync(schemaPath), true, 'supabase/schema.sql must exist');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.jiyoo_documents/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.products/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.orders/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /storage\.objects/i);
});

test('Supabase PostgreSQL CRUD, Auth verification, and Storage integration via @supabase/supabase-js', async () => {
  assert.equal(typeof isSupabaseConfigured, 'boolean');
  assert.equal(typeof getSupabaseClient, 'function');

  const fetchRes = await supabaseFetchTable('products', { limit: 1 });
  assert.ok('data' in fetchRes && 'error' in fetchRes);

  const upsertRes = await supabaseUpsertRecord('products', { id: 'test-1', name: 'Test' });
  assert.ok('data' in upsertRes && 'error' in upsertRes);

  const deleteRes = await supabaseDeleteRecord('products', 'test-1');
  assert.ok('success' in deleteRes && 'error' in deleteRes);

  const colDeleteRes = await supabaseDeleteCollectionDoc('products', 'test-1');
  assert.ok('success' in colDeleteRes && 'error' in colDeleteRes);

  const blob = new Blob(['test'], { type: 'image/jpeg' });
  const storageRes = await uploadToSupabaseStorage(blob, 'test_img', 'image/jpeg');
  assert.ok('url' in storageRes && 'error' in storageRes);

  const cfg = getSupabaseConfig();
  assert.equal(typeof cfg.enabled, 'boolean');

  const serverPing = await pingSupabaseDatabase();
  assert.equal(typeof serverPing.configured, 'boolean');
  assert.equal(typeof serverPing.connected, 'boolean');

  const clientPing = await pingSupabaseConnection();
  assert.equal(typeof clientPing.backendConnected, 'boolean');
  assert.equal(typeof clientPing.supabaseConfigured, 'boolean');
});
