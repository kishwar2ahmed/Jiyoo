export interface RetailAreaItem {
  id: string;
  slNo: number;
  areaName: string;
  pincode: string;
  displayPincode: string;
  hasSubAreaAsterisk?: boolean;
  enabled: boolean;
}

export interface RetailPincodeDefault {
  pincode: string;
  label: string;
  areas: string[];
  enabled: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
}

/**
 * The 13 currently active Bangalore retail delivery areas specified by JIYOO,
 * mapped to their 5 6-digit PIN codes. Admins can modify/toggle PIN codes and
 * labels anytime via Admin -> Delivery Management.
 */
export const DEFAULT_RETAIL_AREAS: RetailAreaItem[] = [
  { id: 'area-1', slNo: 1, areaName: 'Kammanahalli', pincode: '560084', displayPincode: '560084', enabled: true },
  { id: 'area-2', slNo: 2, areaName: 'Banaswadi', pincode: '560043', displayPincode: '560043', enabled: true },
  { id: 'area-3', slNo: 3, areaName: 'Lingarajapuram', pincode: '560084', displayPincode: '560084', enabled: true },
  { id: 'area-4', slNo: 4, areaName: 'HRBR Layout', pincode: '560043', displayPincode: '560043', enabled: true },
  { id: 'area-5', slNo: 5, areaName: 'HBR Layout', pincode: '560043', displayPincode: '560043', enabled: true },
  { id: 'area-6', slNo: 6, areaName: 'Nagawara', pincode: '560045', displayPincode: '560045', enabled: true },
  { id: 'area-7', slNo: 7, areaName: 'Govindpura', pincode: '560045', displayPincode: '560045*', hasSubAreaAsterisk: true, enabled: true },
  { id: 'area-8', slNo: 8, areaName: 'RT Nagar', pincode: '560032', displayPincode: '560032', enabled: true },
  { id: 'area-9', slNo: 9, areaName: 'Sultan Palya', pincode: '560032', displayPincode: '560032*', hasSubAreaAsterisk: true, enabled: true },
  { id: 'area-10', slNo: 10, areaName: 'Hennur', pincode: '560043', displayPincode: '560043', enabled: true },
  { id: 'area-11', slNo: 11, areaName: 'Kalyan Nagar', pincode: '560043', displayPincode: '560043', enabled: true },
  { id: 'area-12', slNo: 12, areaName: 'Tannery Road', pincode: '560005', displayPincode: '560005*', hasSubAreaAsterisk: true, enabled: true },
  { id: 'area-13', slNo: 13, areaName: 'Frazer Town', pincode: '560005', displayPincode: '560005', enabled: true },
];

export const DEFAULT_RETAIL_PINCODES: Record<string, RetailPincodeDefault> = {
  '560084': {
    pincode: '560084',
    label: 'Kammanahalli, Lingarajapuram',
    areas: ['Kammanahalli', 'Lingarajapuram'],
    enabled: true,
  },
  '560043': {
    pincode: '560043',
    label: 'Banaswadi, HRBR Layout, HBR Layout, Hennur, Kalyan Nagar',
    areas: ['Banaswadi', 'HRBR Layout', 'HBR Layout', 'Hennur', 'Kalyan Nagar'],
    enabled: true,
  },
  '560045': {
    pincode: '560045',
    label: 'Nagawara, Govindpura (560045*)',
    areas: ['Nagawara', 'Govindpura (560045*)'],
    enabled: true,
  },
  '560032': {
    pincode: '560032',
    label: 'RT Nagar, Sultan Palya (560032*)',
    areas: ['RT Nagar', 'Sultan Palya (560032*)'],
    enabled: true,
  },
  '560005': {
    pincode: '560005',
    label: 'Frazer Town, Tannery Road (560005*)',
    areas: ['Frazer Town', 'Tannery Road (560005*)'],
    enabled: true,
  },
};

export const DEFAULT_PAN_INDIA_WHOLESALE_ZONE = {
  id: 'pan-india-default',
  label: 'All Over India (Pan-India Wholesale)',
  pincodePrefixes: ['ALL'],
  enabled: true,
  shippingFee: 0,
  minOrderValue: 0,
  etaDays: '2-5 business days (All India)',
};

export function normalizeIndianPincode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\*+$/, '')
    .trim();
}

export function isValidIndianPincode(raw: unknown): boolean {
  const clean = normalizeIndianPincode(raw);
  return /^[1-9]\d{5}$/.test(clean);
}
