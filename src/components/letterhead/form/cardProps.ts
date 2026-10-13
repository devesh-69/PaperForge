import type { Letterhead } from '../../../letterhead/types';

/** Props shared by every section card of the letterhead form. */
export interface CardProps {
  lh: Letterhead;
  set: (patch: Partial<Letterhead>) => void;
}
