type NamedRecord = {
  id: number;
  name: string;
};

export function sortNamedRecords<T extends NamedRecord>(records: readonly T[]): T[] {
  return [...records].sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.id - right.id;
  });
}
