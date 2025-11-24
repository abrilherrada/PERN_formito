export const toOrderedEntries = (value) => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => ({
      key: String(index),
      type: 'array',
      value: toOrderedEntries(entry),
      position: index,
    }));
  }

  return Object.entries(value).map(([key, entry], index) => ({
    key,
    type: 'object',
    value: toOrderedEntries(entry),
    position: index,
  }));
};

export const fromOrderedEntries = (ordered) => {
  if (!Array.isArray(ordered)) {
    return ordered;
  }

  const isObjectList = ordered.every((item) => item?.type === 'object');

  if (isObjectList) {
    return ordered
      .sort((a, b) => a.position - b.position)
      .reduce((acc, item) => {
        acc[item.key] = fromOrderedEntries(item.value);
        return acc;
      }, {});
  }

  return ordered
    .sort((a, b) => a.position - b.position)
    .map((item) => fromOrderedEntries(item.value));
};