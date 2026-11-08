import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PRODUCTS as BUNDLED_PRODUCTS } from '../constants/data';
import {
  DEFAULT_RETAIL_PINCODES,
  DEFAULT_PAN_INDIA_WHOLESALE_ZONE,
} from '../constants/deliveryAreas';

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), '.server-data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'store-db.json');
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? '/tmp/.server-data' : BUNDLED_DATA_DIR;
const DB_FILE = IS_SERVERLESS ? '/tmp/.server-data/store-db.json' : BUNDLED_DB_FILE;

type CollectionStore = Record<string, Record<string, any>>;

let store: Record<string, CollectionStore> = {};
let initialized = false;
let saveTimer: NodeJS.Timeout | null = null;

function getByPath(obj: any, fieldPath: string, docId?: string): any {
  if (fieldPath === '__name__') return docId;
  if (!obj || typeof obj !== 'object') return undefined;
  if (fieldPath in obj) return obj[fieldPath];
  const parts = fieldPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(target: Record<string, any>, key: string, value: any) {
  const ctorName = value?.constructor?.name;
  if (ctorName === 'DeleteTransform') {
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = target;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur || typeof cur !== 'object') return;
        cur = cur[parts[i]];
      }
      if (cur && typeof cur === 'object') {
        delete cur[parts[parts.length - 1]];
      }
    } else {
      delete target[key];
    }
    return;
  }

  if (ctorName === 'NumericIncrementTransform' && typeof value.operand === 'number') {
    const existing = Number(getByPath(target, key) || 0);
    const nextVal = (Number.isFinite(existing) ? existing : 0) + value.operand;
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = target;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = nextVal;
    } else {
      target[key] = nextVal;
    }
    return;
  }

  if (key.includes('.')) {
    const parts = key.split('.');
    let cur = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = sanitizeTransforms(value, cur[parts[parts.length - 1]]);
  } else {
    target[key] = sanitizeTransforms(value, target[key]);
  }
}

function sanitizeTransforms(val: any, prevVal?: any): any {
  if (val == null || typeof val !== 'object') return val;
  const ctorName = val?.constructor?.name;
  if (ctorName === 'NumericIncrementTransform' && typeof val.operand === 'number') {
    const base = Number(prevVal || 0);
    return (Number.isFinite(base) ? base : 0) + val.operand;
  }
  if (ctorName === 'DeleteTransform') {
    return undefined;
  }
  if (ctorName === 'ServerTimestampTransform') {
    return new Date().toISOString();
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeTransforms(item));
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v?.constructor?.name === 'DeleteTransform') continue;
    out[k] = sanitizeTransforms(v, prevVal?.[k]);
  }
  return out;
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ServerFallbackDb] Could not persist db to disk:', err);
    }
  }, 150);
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  try {
    const sourceFile = fs.existsSync(DB_FILE)
      ? DB_FILE
      : fs.existsSync(BUNDLED_DB_FILE)
      ? BUNDLED_DB_FILE
      : null;
    if (sourceFile) {
      const raw = fs.readFileSync(sourceFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        store = parsed;
      }
    }
  } catch (err) {
    console.warn('[ServerFallbackDb] Starting with fresh store:', err);
    store = {};
  }

  if (!store.products) store.products = {};
  for (const p of BUNDLED_PRODUCTS) {
    const id = String(p.id);
    const numPrice =
      Number(p.numericPrice) ||
      parseFloat(String(p.price).replace(/[^0-9.]/g, '')) ||
      0;
    const existing = store.products[id];
    const isAdminEdited = existing?.adminEdited === true;
    store.products[id] = {
      ...(existing || {}),
      ...p,
      id,
      name: isAdminEdited ? (existing?.name || p.name) : p.name,
      category: p.category || 'General',
      categoryId:
        (p as any).categoryId ||
        (p.category ? String(p.category).toLowerCase().replace(/\s+/g, '-') : 'general'),
      subcategoryId: isAdminEdited
        ? (existing?.subcategoryId ?? (p as any).subcategoryId ?? null)
        : ((p as any).subcategoryId || existing?.subcategoryId || null),
      subSubcategoryId: (p as any).subSubcategoryId || existing?.subSubcategoryId || null,
      unit: isAdminEdited
        ? (existing?.unit || (p as any).unit || '1 kg')
        : ((p as any).unit || existing?.unit || '1 kg'),
      price: isAdminEdited ? (existing?.price ?? p.price) : p.price,
      numericPrice: isAdminEdited ? (existing?.numericPrice ?? numPrice) : numPrice,
      mrp: isAdminEdited ? (existing?.mrp ?? (p as any).mrp) : (p as any).mrp,
      originalPrice: isAdminEdited ? (existing?.originalPrice ?? (p as any).originalPrice) : (p as any).originalPrice,
      discount: isAdminEdited ? (existing?.discount ?? (p as any).discount) : (p as any).discount,
      weights: isAdminEdited
        ? (Array.isArray(existing?.weights) ? existing.weights : (p as any).weights)
        : (p as any).weights,
      wholesalePrice: (p as any).wholesalePrice || existing?.wholesalePrice || numPrice,
      wholesaleEligible: (p as any).wholesaleEligible === true || existing?.wholesaleEligible === true,
      wholesaleUnit: (p as any).wholesaleUnit || existing?.wholesaleUnit || (p as any).unit || 'Wholesale Box',
      wholesaleMinQty: (p as any).wholesaleMinQty || existing?.wholesaleMinQty || 1,
      brand: (p as any).brand ?? existing?.brand ?? null,
      origin: isAdminEdited
        ? (existing?.origin ?? (p as any).origin ?? null)
        : ((p as any).origin ?? existing?.origin ?? null),
      count: (p as any).count ?? existing?.count ?? null,
      netWeight: (p as any).netWeight ?? existing?.netWeight ?? null,
      stock: typeof existing?.stock === 'number' ? existing.stock : 250,
      reservedStock: typeof existing?.reservedStock === 'number' ? existing.reservedStock : 0,
      stockStatus: existing?.stockStatus || 'in_stock',
      isDeleted: existing?.isDeleted === true ? true : false,
      adminEdited: isAdminEdited,
      updatedAt: existing?.updatedAt || new Date().toISOString(),
    };
  }

  if (!store.deliveryPincodes) store.deliveryPincodes = {};
  for (const [pin, row] of Object.entries(DEFAULT_RETAIL_PINCODES)) {
    if (!store.deliveryPincodes[pin]) {
      store.deliveryPincodes[pin] = { ...row };
    }
  }

  if (!store.wholesaleZones) store.wholesaleZones = {};
  if (Object.keys(store.wholesaleZones).length === 0) {
    store.wholesaleZones[DEFAULT_PAN_INDIA_WHOLESALE_ZONE.id] = {
      ...DEFAULT_PAN_INDIA_WHOLESALE_ZONE,
    };
  }

  if (!store.settings) store.settings = {};
  if (!store.settings.global) {
    store.settings.global = {
      storeName: 'JIYOO Premium Products',
      contactEmail: 'shamsjiyoo@gmail.com',
      whatsappNumber: '919739391891',
      upiId: '9739391891@ybl',
      upiId2: '9739391891@paytm',
      deliveryFee: 40,
      freeDeliveryThreshold: 0,
      estimatedDeliveryTime: '30 - 60 mins',
      minOrderAmount: 0,
    };
  }

  if (!store.coupons) store.coupons = {};
  if (!store.coupons.WELCOME10) {
    store.coupons.WELCOME10 = {
      id: 'WELCOME10',
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      description: '10% off your fresh produce order',
      minOrderValue: 299,
      isActive: true,
      usedCount: 0,
    };
  }

  if (!store.orders) store.orders = {};
  if (!store.users) store.users = {};
  if (!store.audit_logs) store.audit_logs = {};

  scheduleSave();
}

function getCollectionMap(name: string): CollectionStore {
  ensureInitialized();
  if (!store[name]) {
    store[name] = {};
  }
  return store[name];
}

class FallbackDocumentSnapshot {
  readonly id: string;
  readonly ref: FallbackDocumentReference;
  private readonly _data: Record<string, any> | undefined;

  constructor(ref: FallbackDocumentReference, data: Record<string, any> | undefined) {
    this.id = ref.id;
    this.ref = ref;
    this._data = data ? JSON.parse(JSON.stringify(data)) : undefined;
  }

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): any {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }
}

class FallbackDocumentReference {
  readonly id: string;
  readonly collectionName: string;
  readonly path: string;

  constructor(collectionName: string, id: string) {
    this.collectionName = collectionName;
    this.id = String(id);
    this.path = `${collectionName}/${this.id}`;
  }

  collection(subCollectionName: string): FallbackCollectionReference {
    return new FallbackCollectionReference(`${this.path}/${subCollectionName}`);
  }

  async get(): Promise<FallbackDocumentSnapshot> {
    const col = getCollectionMap(this.collectionName);
    return new FallbackDocumentSnapshot(this, col[this.id]);
  }

  async set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
    const col = getCollectionMap(this.collectionName);
    const current = options?.merge && col[this.id] ? { ...col[this.id] } : {};
    for (const [k, v] of Object.entries(data || {})) {
      setByPath(current, k, v);
    }
    if (this.collectionName === 'products') {
      current.adminEdited = true;
    }
    col[this.id] = current;
    scheduleSave();
  }

  async update(data: Record<string, any>): Promise<void> {
    const col = getCollectionMap(this.collectionName);
    const current = col[this.id] ? { ...col[this.id] } : {};
    for (const [k, v] of Object.entries(data || {})) {
      setByPath(current, k, v);
    }
    if (this.collectionName === 'products') {
      current.adminEdited = true;
    }
    col[this.id] = current;
    scheduleSave();
  }

  async delete(): Promise<void> {
    const col = getCollectionMap(this.collectionName);
    delete col[this.id];
    scheduleSave();
  }
}

interface FilterSpec {
  field: string;
  op: string;
  value: any;
}

interface OrderSpec {
  field: string;
  dir: 'asc' | 'desc';
}

class FallbackQuery {
  protected readonly collectionName: string;
  protected readonly filters: FilterSpec[];
  protected readonly orders: OrderSpec[];
  protected readonly startAfterValues: any[] | null;
  protected readonly limitCount: number | null;

  constructor(
    collectionName: string,
    filters: FilterSpec[] = [],
    orders: OrderSpec[] = [],
    startAfterValues: any[] | null = null,
    limitCount: number | null = null
  ) {
    this.collectionName = collectionName;
    this.filters = filters;
    this.orders = orders;
    this.startAfterValues = startAfterValues;
    this.limitCount = limitCount;
  }

  where(field: string, op: string, value: any): FallbackQuery {
    return new FallbackQuery(
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.orders,
      this.startAfterValues,
      this.limitCount
    );
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): FallbackQuery {
    return new FallbackQuery(
      this.collectionName,
      this.filters,
      [...this.orders, { field, dir }],
      this.startAfterValues,
      this.limitCount
    );
  }

  startAfter(...values: any[]): FallbackQuery {
    return new FallbackQuery(
      this.collectionName,
      this.filters,
      this.orders,
      values,
      this.limitCount
    );
  }

  limit(n: number): FallbackQuery {
    return new FallbackQuery(
      this.collectionName,
      this.filters,
      this.orders,
      this.startAfterValues,
      n
    );
  }

  async get(): Promise<{ empty: boolean; size: number; docs: FallbackDocumentSnapshot[]; forEach: (cb: (d: FallbackDocumentSnapshot) => void) => void }> {
    const col = getCollectionMap(this.collectionName);
    let entries = Object.entries(col).map(([id, data]) => ({
      id,
      data,
      ref: new FallbackDocumentReference(this.collectionName, id),
    }));

    for (const f of this.filters) {
      entries = entries.filter((entry) => {
        const actual = getByPath(entry.data, f.field, entry.id);
        switch (f.op) {
          case '==':
            return actual === f.value;
          case '!=':
            return actual !== f.value;
          case 'in':
            return Array.isArray(f.value) && f.value.includes(actual);
          case 'array-contains':
            return Array.isArray(actual) && actual.includes(f.value);
          case '<':
            return actual < f.value;
          case '<=':
            return actual <= f.value;
          case '>':
            return actual > f.value;
          case '>=':
            return actual >= f.value;
          default:
            return true;
        }
      });
    }

    if (this.orders.length > 0) {
      entries.sort((a, b) => {
        for (const o of this.orders) {
          const av = getByPath(a.data, o.field, a.id) ?? '';
          const bv = getByPath(b.data, o.field, b.id) ?? '';
          if (av < bv) return o.dir === 'asc' ? -1 : 1;
          if (av > bv) return o.dir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    if (this.startAfterValues && this.startAfterValues.length > 0 && this.orders.length > 0) {
      const firstVal = this.startAfterValues[0];
      if (firstVal && typeof firstVal === 'object' && 'id' in firstVal && typeof firstVal.data === 'function') {
        const snapId = firstVal.id;
        const idx = entries.findIndex((e) => e.id === snapId);
        entries = idx >= 0 ? entries.slice(idx + 1) : [];
      } else {
        const startIndex = entries.findIndex((entry) => {
          for (let i = 0; i < this.startAfterValues!.length; i++) {
            const o = this.orders[i];
            if (!o) break;
            const actual = getByPath(entry.data, o.field, entry.id);
            const cursorVal = this.startAfterValues![i];
            if (actual === cursorVal) continue;
            return o.dir === 'asc' ? actual > cursorVal : actual < cursorVal;
          }
          return false;
        });
        entries = startIndex >= 0 ? entries.slice(startIndex) : [];
      }
    }

    if (typeof this.limitCount === 'number' && this.limitCount >= 0) {
      entries = entries.slice(0, this.limitCount);
    }

    const docs = entries.map((e) => new FallbackDocumentSnapshot(e.ref, e.data));
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (cb) => docs.forEach(cb),
    };
  }
}

class FallbackCollectionReference extends FallbackQuery {
  constructor(collectionName: string) {
    super(collectionName);
  }

  doc(id?: string): FallbackDocumentReference {
    const resolvedId = id || `doc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    return new FallbackDocumentReference(this.collectionName, resolvedId);
  }

  async add(data: Record<string, any>): Promise<FallbackDocumentReference> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class FallbackWriteBatch {
  private ops: (() => Promise<void>)[] = [];

  set(ref: FallbackDocumentReference, data: Record<string, any>, options?: { merge?: boolean }) {
    this.ops.push(() => ref.set(data, options));
    return this;
  }

  create(ref: FallbackDocumentReference, data: Record<string, any>) {
    this.ops.push(() => ref.set(data));
    return this;
  }

  update(ref: FallbackDocumentReference, data: Record<string, any>) {
    this.ops.push(() => ref.update(data));
    return this;
  }

  delete(ref: FallbackDocumentReference) {
    this.ops.push(() => ref.delete());
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.ops) {
      await op();
    }
  }
}

class FallbackTransaction {
  async get(target: FallbackDocumentReference | FallbackQuery): Promise<any> {
    return target.get();
  }

  set(ref: FallbackDocumentReference, data: Record<string, any>, options?: { merge?: boolean }) {
    void ref.set(data, options);
    return this;
  }

  create(ref: FallbackDocumentReference, data: Record<string, any>) {
    void ref.set(data);
    return this;
  }

  update(ref: FallbackDocumentReference, data: Record<string, any>) {
    void ref.update(data);
    return this;
  }

  delete(ref: FallbackDocumentReference) {
    void ref.delete();
    return this;
  }
}

export class ServerFallbackFirestore {
  collection(name: string): FallbackCollectionReference {
    return new FallbackCollectionReference(name);
  }

  async getAll(...refs: FallbackDocumentReference[]): Promise<FallbackDocumentSnapshot[]> {
    return Promise.all(refs.map((r) => r.get()));
  }

  batch(): FallbackWriteBatch {
    return new FallbackWriteBatch();
  }

  async runTransaction<T>(updateFunction: (tx: FallbackTransaction) => Promise<T>): Promise<T> {
    const tx = new FallbackTransaction();
    return updateFunction(tx);
  }
}

export const serverFallbackDb = new ServerFallbackFirestore();
