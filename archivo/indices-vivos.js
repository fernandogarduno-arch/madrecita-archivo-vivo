const folded = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const clean = value => typeof value === 'string' ? value.trim() : '';
const humanSort = (a, b) => b.ids.length - a.ids.length || a.name.localeCompare(b.name, 'es');

function validateChanges(changes) {
  if (!Array.isArray(changes)) throw new Error('La publicación de la colección está incompleta.');
  const unique = new Map();
  for (const change of changes) {
    if (!change || !clean(change.id) || typeof change.active !== 'boolean' || !Number.isSafeInteger(change.version) || change.version < 1) {
      throw new Error('No se pudo verificar el estado publicado de las piezas.');
    }
    if (unique.has(change.id)) throw new Error('La publicación contiene estados contradictorios.');
    unique.set(change.id, change);
  }
  return unique;
}

function publicRecord(id, original, change) {
  if (!change) return { ...original, brand: original.brand || '', model: original.name };
  const record = original ? { ...original } : {
    id, detail: '', volume: '', nom: '', nomSource: '', agave: '', typePercent: '', abv: '',
    photoReference: '', photos: [], photoStatus: 'Por cotejar'
  };
  const photos = [...(record.photos || [])];
  if (change.photo) photos.unshift({ src: change.photo, source: 'Administración de la colección', adminPhoto: true });
  const name = clean(change.model) || clean(change.brand) || original?.name || id;
  return {
    ...record, id, name, brand: clean(change.brand), model: clean(change.model),
    category: clean(change.category), producer: clean(change.producer), origin: clean(change.origin),
    photos, photoStatus: change.photo ? 'Foto vinculada por administración' : record.photoStatus,
    adminEdition: true
  };
}

function addPlace(collection, label, state, id) {
  const key = folded(label) + '|' + folded(state);
  if (!collection.has(key)) collection.set(key, { label, state, ids: [] });
  collection.get(key).ids.push(id);
}

export function mergeCollection({ catalog, locations, producers, geography, changes }) {
  const byChange = validateChanges(changes);
  const oldRecords = new Map(catalog.records.map(record => [record.id, record]));
  const oldLocation = new Map();
  const oldProducer = new Map();
  const historicalMakers = new Map();
  const placeByName = new Map();
  const regionByPlace = new Map();
  const regionByText = new Map();
  const regionPlaces = new Map(geography.regions.map(region => [region.slug, new Set()]));
  for (const place of locations.places) {
    const key = folded(place.label);
    const candidates = placeByName.get(key) || [];
    candidates.push(place);
    placeByName.set(key, candidates);
    for (const id of place.ids) oldLocation.set(id, place);
  }
  for (const region of geography.regions) {
    regionByText.set(folded(region.name), region.slug);
    regionByText.set(folded(region.slug), region.slug);
    for (const place of region.places) regionByPlace.set(folded(place), region.slug);
  }
  for (const maker of producers.producers) {
    const key = JSON.stringify([folded(maker.name), folded(maker.place), regionByPlace.get(folded(maker.place)) || '']);
    historicalMakers.set(key, maker.id);
    for (const id of maker.ids) oldProducer.set(id, maker);
  }
  const records = [], placeGroups = new Map(), makerGroups = new Map(), unplaced = [];
  const knownIds = new Set([...oldRecords.keys(), ...byChange.keys()]);
  for (const id of knownIds) {
    const change = byChange.get(id);
    if (change && !change.active) continue;
    const old = oldRecords.get(id), oldPlace = oldLocation.get(id), oldMaker = oldProducer.get(id);
    const record = publicRecord(id, old, change);
    const label = change ? clean(change.place) : (oldPlace?.label || '');
    const samePlace = folded(oldPlace?.label) === folded(label);
    const knownPlaces = placeByName.get(folded(label)) || [];
    const matchedPlace = samePlace ? oldPlace : (knownPlaces.length === 1 ? knownPlaces[0] : null);
    const region = change ? (regionByText.get(folded(change.region)) || '') :
      (oldPlace?.state === 'Jalisco' ? regionByPlace.get(folded(label)) || '' : '');
    const state = region ? 'Jalisco' : matchedPlace?.state || '';
    record.region = region;
    record.place = label;
    records.push(record);

    // Una región consignada sin municipio sigue siendo exhibible en el atlas.
    const displayPlace = label || (region ? 'Localidad pendiente' : '');
    if (displayPlace) {
      addPlace(placeGroups, displayPlace, state, id);
    } else {
      unplaced.push(id);
      continue;
    }

    const originalAttribution = Boolean(oldMaker && samePlace &&
      (!change || [old?.producer, oldMaker.name].some(source => folded(source) === folded(record.producer))));
    const makerName = originalAttribution ? oldMaker.name :
      (record.producer || 'Productor pendiente de identificar');
    if (!oldMaker && !change && !region) continue;
    const key = JSON.stringify([folded(makerName), folded(displayPlace), region]);
    if (!makerGroups.has(key)) {
      const historicalId = historicalMakers.get(key);
      const generatedId = 'P-A-' + encodeURIComponent(key);
      makerGroups.set(key, {
        id: historicalId || generatedId, name: makerName, place: displayPlace, region, ids: []
      });
    }
    makerGroups.get(key).ids.push(id);
    if (region) regionPlaces.get(region).add(displayPlace);
  }

  const active = new Set(records.map(row => row.id));
  const featured = catalog.featured.filter(id => active.has(id));
  const places = Array.from(placeGroups.values()).sort((a,b) => b.ids.length-a.ids.length || a.label.localeCompare(b.label,'es'));
  const makerIndex = Array.from(makerGroups.values()).sort(humanSort);
  return {
    catalog: { ...catalog, records, featured, stats: { ...catalog.stats, records: records.length } },
    locations: { places, unplaced }, producers: { producers: makerIndex },
    geography: { ...geography, regions: geography.regions.map(region => ({
      ...region, places: Array.from(regionPlaces.get(region.slug))
    })) },
    featuredSlots: Object.fromEntries(catalog.featured.map((id,i) => [id,i])),
    activeIds: active
  };
}
