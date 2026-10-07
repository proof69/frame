// Keep existing database values so deployed Supabase projects need no migration.
export const categoryLabels = {
  'Filmové': 'Cinematic',
  'Příroda': 'Nature',
  'Lifestyle': 'Lifestyle',
  'Cestování': 'Travel',
  'Vintage': 'Vintage',
};
export const assetCategories = Object.keys(categoryLabels);
export const categoryLabel = value => categoryLabels[value] || value;
