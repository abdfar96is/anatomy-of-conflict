// Typed views on the record fields the dossier reads (the DB keeps them as open raw fields), plus the render context.

import type { ReactNode } from 'react';
import type { useT } from '../../app/useT';
import type { Bi } from '../../i18n/format';
import type {
  Bloc, Chokepoint, Conflict, DB, Disputed, Group, Kind, Provenance, ResourceEntry, Site, TimelineCategory, TimelineEvent, Tradition,
} from '../../data/types';

export type Ctx = ReturnType<typeof useT> & { db: DB };
export type Sel = { kind: Kind; id: string };

export type BiList = { ar?: string[]; en?: string[] };
export interface ExtPower { iso3: string; role?: Bi; kind?: string }
export interface Recent { date: string; ar?: string; en?: string; source?: string }
export type ConflictX = Conflict & {
  status?: Bi; statusAsOf?: string; currentPhaseStarted?: string; confidence?: string; recent?: Recent[];
  parties?: BiList; dimensions?: string[]; dimensionNote?: Bi; ethnoReligious?: Bi; ethnoReligiousNote?: Bi;
  history?: Bi; politicalCauses?: Bi; territorialClaims?: Bi; strategicInterests?: Bi;
};
export type ChokeX = Chokepoint & { status?: string; oilFlowMbd?: number | null; flowYear?: number };
export type EventX = TimelineEvent & { cat?: string[] };
export type BlocX = Bloc & { kind?: string };
export type ResEntryX = ResourceEntry & { rank?: number; year?: number; source?: string; ar?: string; en?: string };
export type CatX = TimelineCategory & { ar?: string; en?: string; color?: string };
export interface EdgeX extends Provenance { id: string; a: string; b: string; type: string; kind: string; weight?: number; contested?: boolean; ar?: string; en?: string }
export interface IntelX { system?: Bi; langs?: BiList; separatists?: Bi[]; disputes?: Bi[] }
export interface RefX { name?: Bi; role?: Bi; url?: string }
export interface DatasetX { title?: Bi; publisher?: string; url?: string }
export type { Disputed, Group, Provenance, Site, Tradition };

/** The header model of one record: eyebrow region, name, plate items, badges and an optional extra row. */
export interface Head { region: string; title: string; plate: ReactNode[]; badges: ReactNode[]; extra?: ReactNode }
/** One tab; single-panel kinds have one tab without a label. */
export interface TabDef { id: string; label?: string; count?: number | null; render: () => ReactNode }
export interface Panel { head: Head; tabs: TabDef[] }

/** External powers with their edge kind (the raw type leaves extra fields open). */
export const extPowers = (cf: Conflict): ExtPower[] => (cf.externalPowers ?? []) as ExtPower[];

/** Pick a bilingual list ({ar: [...], en: [...]}). */
export const pickList = (c: Ctx, x: BiList | null | undefined): string[] => (x ? x[c.lang] ?? x.ar ?? x.en ?? [] : []);
