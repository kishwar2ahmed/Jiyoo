import { Category, Product } from '../types/index';
import { ALL_PRODUCTS } from './productsData';
import { VEG_MEAT_SMOOTHIE_PRODUCTS } from './productsVegData';

export const CATEGORIES: Category[] = [
  {
    id: 'fruits',
    label: 'Fruits',
    items: [
      { id: 'imported-fruits', label: 'Imported Fruits' },
      { id: 'indian-fruits', label: 'Indian Fruits' }
    ]
  },
  {
    id: 'vegetables',
    label: 'Vegetables',
    items: [
      { id: 'thai-vegetables', label: 'Thai Vegetables' },
      { id: 'indian-vegetables', label: 'Indian Vegetables' }
    ]
  },
  {
    id: 'meat',
    label: 'Meat',
    items: [
      { 
        id: 'chicken', 
        label: 'Chicken',
        items: [
          { id: 'boneless-cut', label: 'Boneless Cut' },
          { id: 'bone-cut', label: 'Bone Cut' },
          { id: 'curry-cut', label: 'Curry Cut' },
          { id: 'biryani-cut', label: 'Biryani Cut' },
          { id: 'kabab-cut', label: 'Kabab Cut' }
        ]
      },
      { 
        id: 'mutton', 
        label: 'Mutton',
        items: [
          { id: 'boneless-cut', label: 'Boneless Cut' },
          { id: 'bone-cut', label: 'Bone Cut' },
          { id: 'curry-cut', label: 'Curry Cut' },
          { id: 'biryani-cut', label: 'Biryani Cut' },
          { id: 'kabab-cut', label: 'Kabab Cut' }
        ]
      },
      { 
        id: 'fish', 
        label: 'Fish',
        items: [
          { id: 'rohu', label: 'Rohu' },
          { id: 'katla', label: 'Katla' },
          { id: 'pomfret', label: 'Pomfret' },
          { id: 'surmai', label: 'Surmai' }
        ]
      },
      { id: 'prawns', label: 'Prawns' }
    ]
  },
  {
    id: 'smoothies',
    label: 'Smoothies'
  },
  {
    id: 'fast-foods',
    label: 'Fast Foods',
    items: [
      { id: 'momos', label: 'Momos' },
      { id: 'fried-rice', label: 'Fried Rice' },
      { id: 'noodles', label: 'Noodles' },
      { id: 'snacks', label: 'Snacks' },
      { id: 'indo-chinese-specials', label: 'Indo-Chinese Specials' }
    ]
  }
];

export const PRODUCTS: Product[] = [
  ...ALL_PRODUCTS,
  ...VEG_MEAT_SMOOTHIE_PRODUCTS
];
