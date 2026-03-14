import type { ITrainingClass } from '../types';
import type { ClassCodeLookupOption } from '../components/ClassCodeLookupInput';

export const buildTrainingClassLookupOptions = (classes: ITrainingClass[]): ClassCodeLookupOption[] => {
  const deduped = new Map<string, ClassCodeLookupOption>();

  classes.forEach((item) => {
    const code = item.code || item.id;
    if (!code || deduped.has(code)) return;

    deduped.set(code, {
      code,
      name: item.name || item.id,
      campus: item.campus,
      schedule: item.schedule,
      level: item.level,
      classType: item.classType,
      status: item.status
    });
  });

  return Array.from(deduped.values()).sort((left, right) => left.code.localeCompare(right.code, 'vi'));
};
