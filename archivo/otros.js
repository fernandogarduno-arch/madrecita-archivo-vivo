export const OTHER_LABEL = 'Otros';

export function otherCollection(records, unplaced) {
  const ids = new Set(unplaced);
  const groups = new Map();

  for (const record of records) {
    if (!ids.has(record.id)) continue;
    const name = (record.producer || '').trim();
    if (!groups.has(name)) {
      groups.set(name, {
        id: 'otros-' + record.id,
        name: name || 'Productor pendiente de identificar',
        place: OTHER_LABEL,
        ids: [],
        unidentified: !name
      });
    }
    groups.get(name).ids.push(record.id);
  }

  const makers = Array.from(groups.values()).sort((a, b) =>
    Number(a.unidentified) - Number(b.unidentified) ||
    b.ids.length - a.ids.length ||
    a.name.localeCompare(b.name, 'es')
  );
  return { slug: 'otros', name: OTHER_LABEL, count: ids.size, makers };
}

